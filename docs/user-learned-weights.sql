-- ============================================
-- 행동 기반 학습 가중치 테이블
-- 사용자의 pass/hold/apply 행동 패턴을 분석하여
-- 개인화된 점수화에 활용
-- ============================================

-- 1. 학습된 가중치 저장 테이블
CREATE TABLE IF NOT EXISTS public.user_learned_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- 특성 종류: 'depth_two', 'keyword', 'region', 'company_type', 'career_range'
  feature_type TEXT NOT NULL,
  -- 특성 값: 'React', '서울', '스타트업', '3-5년' 등
  feature_value TEXT NOT NULL,

  -- 학습된 가중치 (-1.0 ~ 1.0)
  -- 양수: 선호, 음수: 비선호
  weight DECIMAL(4,3) NOT NULL DEFAULT 0,

  -- 학습 통계
  positive_count INTEGER NOT NULL DEFAULT 0,  -- apply + hold 횟수
  negative_count INTEGER NOT NULL DEFAULT 0,  -- pass 횟수
  total_exposure INTEGER NOT NULL DEFAULT 0,  -- 해당 특성이 있는 공고 노출 횟수

  -- 마지막 업데이트
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 같은 사용자의 동일 특성은 하나만
  UNIQUE(user_id, feature_type, feature_value)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_learned_weights_user_id
  ON public.user_learned_weights(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_weights_feature
  ON public.user_learned_weights(feature_type, feature_value);
CREATE INDEX IF NOT EXISTS idx_learned_weights_weight
  ON public.user_learned_weights(user_id, weight DESC);

-- 3. RLS 정책
ALTER TABLE public.user_learned_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learned weights"
  ON public.user_learned_weights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own learned weights"
  ON public.user_learned_weights FOR ALL
  USING (auth.uid() = user_id);

-- 4. 학습 함수: 사용자의 최근 행동을 분석하여 가중치 업데이트
CREATE OR REPLACE FUNCTION update_user_learned_weights(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_feature RECORD;
  v_weight DECIMAL(4,3);
  v_positive INTEGER;
  v_negative INTEGER;
  v_total INTEGER;
BEGIN
  -- 최근 90일간의 행동 데이터만 분석
  -- depth_twos 기반 학습
  FOR v_feature IN (
    SELECT
      'depth_two' as feature_type,
      dt.value as feature_value,
      COUNT(*) FILTER (WHERE a.action IN ('apply', 'hold')) as positive_count,
      COUNT(*) FILTER (WHERE a.action = 'pass') as negative_count,
      COUNT(*) as total_exposure
    FROM public.user_job_actions a
    JOIN public.jobs j ON j.id::text = a.job_id
    CROSS JOIN LATERAL jsonb_array_elements_text(j.depth_twos) AS dt(value)
    WHERE a.user_id = p_user_id
      AND a.created_at > NOW() - INTERVAL '90 days'
    GROUP BY dt.value
    HAVING COUNT(*) >= 3  -- 최소 3번 이상 노출된 특성만
  )
  LOOP
    v_positive := v_feature.positive_count;
    v_negative := v_feature.negative_count;
    v_total := v_feature.total_exposure;

    -- 가중치 계산: (긍정 - 부정) / 전체, -1 ~ 1 범위
    IF v_total > 0 THEN
      v_weight := LEAST(1.0, GREATEST(-1.0,
        (v_positive::DECIMAL - v_negative::DECIMAL) / v_total::DECIMAL
      ));
    ELSE
      v_weight := 0;
    END IF;

    -- Upsert
    INSERT INTO public.user_learned_weights
      (user_id, feature_type, feature_value, weight, positive_count, negative_count, total_exposure, last_updated)
    VALUES
      (p_user_id, v_feature.feature_type, v_feature.feature_value, v_weight, v_positive, v_negative, v_total, NOW())
    ON CONFLICT (user_id, feature_type, feature_value)
    DO UPDATE SET
      weight = EXCLUDED.weight,
      positive_count = EXCLUDED.positive_count,
      negative_count = EXCLUDED.negative_count,
      total_exposure = EXCLUDED.total_exposure,
      last_updated = NOW();

    v_updated_count := v_updated_count + 1;
  END LOOP;

  -- keywords 기반 학습
  FOR v_feature IN (
    SELECT
      'keyword' as feature_type,
      kw.value as feature_value,
      COUNT(*) FILTER (WHERE a.action IN ('apply', 'hold')) as positive_count,
      COUNT(*) FILTER (WHERE a.action = 'pass') as negative_count,
      COUNT(*) as total_exposure
    FROM public.user_job_actions a
    JOIN public.jobs j ON j.id::text = a.job_id
    CROSS JOIN LATERAL jsonb_array_elements_text(j.keywords) AS kw(value)
    WHERE a.user_id = p_user_id
      AND a.created_at > NOW() - INTERVAL '90 days'
    GROUP BY kw.value
    HAVING COUNT(*) >= 3
  )
  LOOP
    v_positive := v_feature.positive_count;
    v_negative := v_feature.negative_count;
    v_total := v_feature.total_exposure;

    IF v_total > 0 THEN
      v_weight := LEAST(1.0, GREATEST(-1.0,
        (v_positive::DECIMAL - v_negative::DECIMAL) / v_total::DECIMAL
      ));
    ELSE
      v_weight := 0;
    END IF;

    INSERT INTO public.user_learned_weights
      (user_id, feature_type, feature_value, weight, positive_count, negative_count, total_exposure, last_updated)
    VALUES
      (p_user_id, v_feature.feature_type, v_feature.feature_value, v_weight, v_positive, v_negative, v_total, NOW())
    ON CONFLICT (user_id, feature_type, feature_value)
    DO UPDATE SET
      weight = EXCLUDED.weight,
      positive_count = EXCLUDED.positive_count,
      negative_count = EXCLUDED.negative_count,
      total_exposure = EXCLUDED.total_exposure,
      last_updated = NOW();

    v_updated_count := v_updated_count + 1;
  END LOOP;

  -- regions 기반 학습
  FOR v_feature IN (
    SELECT
      'region' as feature_type,
      rg.value as feature_value,
      COUNT(*) FILTER (WHERE a.action IN ('apply', 'hold')) as positive_count,
      COUNT(*) FILTER (WHERE a.action = 'pass') as negative_count,
      COUNT(*) as total_exposure
    FROM public.user_job_actions a
    JOIN public.jobs j ON j.id::text = a.job_id
    CROSS JOIN LATERAL jsonb_array_elements_text(j.regions) AS rg(value)
    WHERE a.user_id = p_user_id
      AND a.created_at > NOW() - INTERVAL '90 days'
    GROUP BY rg.value
    HAVING COUNT(*) >= 3
  )
  LOOP
    v_positive := v_feature.positive_count;
    v_negative := v_feature.negative_count;
    v_total := v_feature.total_exposure;

    IF v_total > 0 THEN
      v_weight := LEAST(1.0, GREATEST(-1.0,
        (v_positive::DECIMAL - v_negative::DECIMAL) / v_total::DECIMAL
      ));
    ELSE
      v_weight := 0;
    END IF;

    INSERT INTO public.user_learned_weights
      (user_id, feature_type, feature_value, weight, positive_count, negative_count, total_exposure, last_updated)
    VALUES
      (p_user_id, v_feature.feature_type, v_feature.feature_value, v_weight, v_positive, v_negative, v_total, NOW())
    ON CONFLICT (user_id, feature_type, feature_value)
    DO UPDATE SET
      weight = EXCLUDED.weight,
      positive_count = EXCLUDED.positive_count,
      negative_count = EXCLUDED.negative_count,
      total_exposure = EXCLUDED.total_exposure,
      last_updated = NOW();

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'updated_features', v_updated_count,
    'user_id', p_user_id
  );
END;
$$;

-- 5. 사용자의 학습된 가중치 조회 함수
CREATE OR REPLACE FUNCTION get_user_learned_weights(p_user_id UUID)
RETURNS TABLE (
  feature_type TEXT,
  feature_value TEXT,
  weight DECIMAL(4,3),
  confidence DECIMAL(4,3)  -- total_exposure 기반 신뢰도
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    feature_type,
    feature_value,
    weight,
    -- 신뢰도: 노출 횟수에 따라 0~1 (10회 이상이면 1.0)
    LEAST(1.0, total_exposure::DECIMAL / 10.0) as confidence
  FROM public.user_learned_weights
  WHERE user_id = p_user_id
    AND ABS(weight) >= 0.1  -- 영향력 있는 가중치만
  ORDER BY ABS(weight) DESC
  LIMIT 100;
$$;
