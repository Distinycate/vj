CREATE OR REPLACE FUNCTION public.check_teams_count() RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.teams;
  RETURN v_count;
END;
$$;
