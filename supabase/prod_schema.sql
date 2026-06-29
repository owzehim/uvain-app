


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "public"."anonymize_expired_members"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  affected_count int;
begin
  update public.members
  set
    first_name = null,
    last_name = null,
    first_name_korean = null,
    last_name_korean = null,
    student_number = null,
    session_token = null,
    profile_image_url = null,
    country_of_origin = null,
    gender = null,
    major = null,
    year_of_birth = null,
    year_number = null,
    education_level = null,
    identity_anonymized_at = now()
  where membership_ended_at is not null
    and membership_ended_at < current_date - interval '12 months'
    and identity_anonymized_at is null;

  get diagnostics affected_count = row_count;

  insert into public.privacy_action_log(action)
  values ('anonymize_expired_members: ' || affected_count || ' rows affected');
end;
$$;


ALTER FUNCTION "public"."anonymize_expired_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."anonymize_expired_members_for_sheets"() RETURNS TABLE("anonymized_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  create temporary table if not exists expired_members_for_privacy_job (
    user_id uuid primary key
  ) on commit drop;

  truncate table expired_members_for_privacy_job;

  insert into expired_members_for_privacy_job (user_id)
  select m.user_id
  from public.members m
  where m.membership_ended_at is not null
    and m.membership_ended_at < current_date - interval '12 months'
    and m.identity_anonymized_at is null;

  -- Preserve generalized analytics before removing raw member fields, if the
  -- analytics table/functions exist in this project.
  if to_regclass('public.member_analytics_profiles') is not null
     and to_regprocedure('public.country_to_region(text)') is not null
     and to_regprocedure('public.major_to_faculty(text)') is not null
     and to_regprocedure('public.study_stage(text, integer)') is not null
     and to_regprocedure('public.birth_year_to_age_group(integer)') is not null then
    insert into public.member_analytics_profiles (
      user_id,
      university,
      region_of_origin,
      faculty_group,
      study_stage,
      age_group,
      gender,
      updated_at
    )
    select
      m.user_id,
      m."University",
      public.country_to_region(m.country_of_origin),
      public.major_to_faculty(m.major),
      public.study_stage(m.education_level, m.year_number),
      public.birth_year_to_age_group(m.year_of_birth),
      m.gender,
      now()
    from public.members m
    join expired_members_for_privacy_job e on e.user_id = m.user_id
    on conflict (user_id) do update set
      university = excluded.university,
      region_of_origin = excluded.region_of_origin,
      faculty_group = excluded.faculty_group,
      study_stage = excluded.study_stage,
      age_group = excluded.age_group,
      gender = excluded.gender,
      updated_at = now();
  end if;

  update public.members m
  set
    first_name = null,
    last_name = null,
    first_name_korean = null,
    last_name_korean = null,
    "University" = null,
    student_number = null,
    major = null,
    education_level = null,
    year_number = null,
    year_of_birth = null,
    country_of_origin = null,
    gender = null,
    profile_image_url = null,
    session_token = null,
    account_status = 'anonymized',
    identity_anonymized_at = now()
  from expired_members_for_privacy_job e
  where e.user_id = m.user_id;

  insert into public.privacy_action_log (action, record_count, details)
  select
    'anonymize_expired_members',
    count(*),
    jsonb_build_object(
      'retention_rule', 'membership_ended_at + 12 months',
      'sheet_sync_required', true
    )
  from expired_members_for_privacy_job;

  return query
  select e.user_id as anonymized_user_id
  from expired_members_for_privacy_job e;
end;
$$;


ALTER FUNCTION "public"."anonymize_expired_members_for_sheets"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."birth_year_to_age_group"("birth_year" integer) RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select case
    when birth_year is null then 'Unknown'
    when extract(year from current_date)::int - birth_year < 20 then 'Under 20'
    when extract(year from current_date)::int - birth_year between 20 and 22 then '20–22'
    when extract(year from current_date)::int - birth_year between 23 and 25 then '23–25'
    when extract(year from current_date)::int - birth_year >= 26 then '26+'
    else 'Unknown'
  end;
$$;


ALTER FUNCTION "public"."birth_year_to_age_group"("birth_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."country_to_region"("country" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when country is null or trim(country) = '' then 'Unknown'

    when country in ('South Korea','North Korea','Japan','China','Taiwan','Mongolia') then 'East Asia'

    when country in ('Vietnam','Thailand','Indonesia','Malaysia','Singapore','Philippines','Cambodia','Laos','Myanmar','Brunei','Timor-Leste') then 'Southeast Asia'

    when country in ('India','Pakistan','Bangladesh','Sri Lanka','Nepal','Bhutan','Maldives','Afghanistan') then 'South Asia'

    when country in ('Netherlands') then 'Netherlands'

    when country in ('Germany','France','Belgium','Luxembourg','Austria','Switzerland','Liechtenstein','Monaco','Ireland','United Kingdom','Italy','Spain','Portugal','Andorra','San Marino','Vatican City','Malta','Denmark','Norway','Sweden','Finland','Iceland') then 'Western / Northern Europe'

    when country in ('Poland','Czech Republic','Czechia','Slovakia','Hungary','Romania','Bulgaria','Croatia','Slovenia','Serbia','Bosnia and Herzegovina','Montenegro','Kosovo','Albania','North Macedonia','Greece','Cyprus','Estonia','Latvia','Lithuania','Moldova','Ukraine','Belarus','Russia') then 'Eastern / Southern Europe'

    when country in ('United States','Canada','Mexico') then 'North America'

    when country in ('Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Paraguay','Peru','Uruguay','Venezuela','Guyana','Suriname') then 'South America'

    when country in ('Bahrain','Iran','Iraq','Israel','Jordan','Kuwait','Lebanon','Oman','Palestine','Qatar','Saudi Arabia','Syria','Turkey','United Arab Emirates','Yemen','Armenia','Azerbaijan','Georgia','Kazakhstan','Kyrgyzstan','Tajikistan','Turkmenistan','Uzbekistan') then 'Middle East / Central Asia'

    when country in ('Australia','New Zealand','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu') then 'Oceania'

    when country in ('Algeria','Egypt','Libya','Morocco','Sudan','Tunisia','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde','Central African Republic','Chad','Comoros','Congo','Djibouti','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Kenya','Lesotho','Liberia','Madagascar','Malawi','Mali','Mauritania','Mauritius','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Tanzania','Togo','Uganda','Zambia','Zimbabwe') then 'Africa'

    when country in ('Bahamas','Barbados','Belize','Costa Rica','Cuba','Dominica','Dominican Republic','El Salvador','Grenada','Guatemala','Haiti','Honduras','Jamaica','Nicaragua','Panama','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Trinidad and Tobago') then 'Central America / Caribbean'

    else 'Other / Unknown'
  end;
$$;


ALTER FUNCTION "public"."country_to_region"("country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_review_prompt_on_redemption"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.review_prompts (
    redemption_id,
    user_id,
    store_id,
    prompt_at
  ) values (
    new.id,
    new.user_id,
    new.store_id,
    new.redeemed_at + interval '50 minutes'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."create_review_prompt_on_redemption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select auth.jwt() -> 'user_metadata' ->> 'role' = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."major_to_faculty"("major" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when major is null or trim(major) = '' then 'Unknown'

    when major ilike any(array[
      '%Business%', '%Economics%', '%Econometrics%', '%Finance%', '%Accountancy%',
      '%Marketing%', '%Management%', '%Entrepreneurship%', '%Banking%',
      '%Real Estate%', '%Asset Management%', '%Corporate Finance%', '%Consumer Marketing%',
      '%Fiscale Economie%', '%Actuarial%', '%Quantitative Finance%'
    ]) then 'Business & Economics'

    when major ilike any(array[
      '%Artificial Intelligence%', '%Computer Science%', '%Data Science%', '%Analytics%',
      '%Biology%', '%Biomedical%', '%Chemistry%', '%Physics%', '%Astronomy%',
      '%Mathematics%', '%Medical Informatics%', '%Information Studies%',
      '%Earth Sciences%', '%Software Engineering%', '%Network Engineering%',
      '%Forensic Science%', '%Quantum%', '%Bioinformatics%', '%Molecular%'
    ]) then 'Science & Technology'

    when major ilike any(array[
      '%Law%', '%Recht%', '%LLM%', '%Criminal%', '%Tax Law%', '%European Union Law%',
      '%Competition Law%', '%Privaatrecht%', '%Publiekrecht%', '%Strafrecht%',
      '%Informatierecht%', '%Technology Governance%'
    ]) then 'Law'

    when major ilike any(array[
      '%Geneeskunde%', '%Medicine%', '%Tandheelkunde%', '%Dentistry%',
      '%Health%', '%Gezondheids%', '%Medical%'
    ]) then 'Medicine & Health'

    when major ilike any(array[
      '%Psychology%', '%Sociology%', '%Political%', '%Communication%',
      '%Anthropology%', '%Pedagog%', '%Education%', '%Onderwijs%',
      '%Human Geography%', '%Urban%', '%Social%', '%Cognition%',
      '%Brain%', '%Development%', '%Governance%', '%International Relations%',
      '%Gender%', '%Youth%', '%Coaching%', '%Human Resource%'
    ]) then 'Social Sciences & Psychology'

    when major ilike any(array[
      '%English%', '%Linguistics%', '%Literature%', '%Culture%', '%Ancient%',
      '%Archaeology%', '%History%', '%Geschiedenis%', '%Philosophy%', '%Filosofie%',
      '%Religion%', '%Religie%', '%Theology%', '%Arts%', '%Media%', '%Film%',
      '%Theatre%', '%Music%', '%Kunst%', '%European Studies%', '%American Studies%',
      '%Middle Eastern%', '%Translation%', '%Classics%', '%Journalism%',
      '%Heritage%', '%Museum%', '%Editor%', '%Redacteur%', '%Language%'
    ]) then 'Humanities & Languages'

    when major ilike any(array[
      '%Liberal Arts%', '%AUC%', '%PPLE%', '%Global%', '%Interdisciplinary%',
      '%Bèta-gamma%', '%Future Planet%', '%Universitaire Pabo%'
    ]) then 'Interdisciplinary'

    when major ilike any(array[
      '%Pre-Master%', '%Bridging%', '%MQP%', '%Qualifying Programme%'
    ]) then 'Pre-Master / Bridging'

    when major ilike any(array[
      '%Teaching%', '%Aardrijkskunde%', '%Algemene economie%', '%Biologie%',
      '%Duits%', '%Engels%', '%Frans%', '%Nederlands%', '%Wiskunde%',
      '%Scheikunde%', '%Natuurkunde%', '%Spaans%'
    ]) then 'Teaching Degree'

    else 'Other / Unknown'
  end;
$$;


ALTER FUNCTION "public"."major_to_faculty"("major" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."study_stage"("education_level" "text", "year_number" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when education_level ilike '%master%' then 'Master'
    when education_level ilike '%pre%' then 'Pre-Master'
    when education_level ilike '%bachelor%' and year_number = 1 then 'Early Bachelor'
    when education_level ilike '%bachelor%' and year_number >= 2 then 'Late Bachelor'
    when education_level is null and year_number = 1 then 'Early Bachelor'
    when education_level is null and year_number >= 2 then 'Late Bachelor'
    else 'Other / Unknown'
  end;
$$;


ALTER FUNCTION "public"."study_stage"("education_level" "text", "year_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_member_analytics_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.member_analytics_profiles (
    user_id,
    university,
    region_of_origin,
    faculty_group,
    study_stage,
    age_group,
    gender,
    updated_at
  )
  values (
    new.user_id,
    new."University",
    public.country_to_region(new.country_of_origin),
    public.major_to_faculty(new.major),
    public.study_stage(new.education_level, new.year_number),
    public.birth_year_to_age_group(new.year_of_birth),
    new.gender,
    now()
  )
  on conflict (user_id) do update set
    university = excluded.university,
    region_of_origin = excluded.region_of_origin,
    faculty_group = excluded.faculty_group,
    study_stage = excluded.study_stage,
    age_group = excluded.age_group,
    gender = excluded.gender,
    updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_member_analytics_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_membership_ended_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- active membership
  if new.membership_valid_until is not null
     and new.membership_valid_until >= current_date then
    new.membership_ended_at = null;
    new.account_status = 'active';
  end if;

  -- expired membership
  if new.membership_valid_until is not null
     and new.membership_valid_until < current_date
     and new.identity_anonymized_at is null then
    new.membership_ended_at = coalesce(new.membership_ended_at, new.membership_valid_until);
    new.account_status = 'expired';
  end if;

  -- already anonymized
  if new.identity_anonymized_at is not null then
    new.account_status = 'anonymized';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_membership_ended_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION "storage"."allow_only_operation"("expected_operation" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" timestamp with time zone,
    "location" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "instagram_url" "text",
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "is_archived" boolean DEFAULT false,
    "event_end_date" timestamp with time zone,
    "event_dates" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "calendar_highlight_mode" "text" DEFAULT 'separate'::"text" NOT NULL,
    "participation_url" "text",
    "is_registration_closed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "events_calendar_highlight_mode_check" CHECK (("calendar_highlight_mode" = ANY (ARRAY['separate'::"text", 'range'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_analytics_profiles" (
    "user_id" "uuid" NOT NULL,
    "university" "text",
    "region_of_origin" "text",
    "faculty_group" "text",
    "study_stage" "text",
    "age_group" "text",
    "gender" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."member_analytics_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "first_name" "text",
    "student_number" "text",
    "major" "text",
    "is_member" boolean DEFAULT false,
    "membership_valid_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_token" "text",
    "University" "text",
    "last_name" "text",
    "year_of_birth" integer,
    "country_of_origin" "text",
    "gender" "text",
    "education_level" "text",
    "year_number" integer,
    "profile_image_url" "text",
    "first_name_korean" "text",
    "last_name_korean" "text",
    "membership_ended_at" "date",
    "identity_anonymized_at" timestamp with time zone,
    "privacy_policy_version" "text",
    "privacy_accepted_at" timestamp with time zone,
    "account_status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "members_education_level_check" CHECK (("education_level" = ANY (ARRAY['bachelor'::"text", 'master'::"text", 'alumni'::"text"]))),
    CONSTRAINT "members_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'non_binary'::"text", 'prefer_not_to_say'::"text"]))),
    CONSTRAINT "members_year_number_check" CHECK ((("year_number" IS NULL) OR (("year_number" >= 1) AND ("year_number" <= 4))))
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stamp_card_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "visited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "card_cycle" integer DEFAULT 1 NOT NULL,
    "added_by_admin" boolean DEFAULT false NOT NULL,
    "admin_note" "text"
);


ALTER TABLE "public"."stamp_card_visits" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_monthly_insights_view" AS
 SELECT "v"."restaurant_id",
    ("date_trunc"('month'::"text", "v"."visited_at"))::"date" AS "report_month",
    "count"(*) AS "total_scans",
    "count"(DISTINCT "v"."user_id") AS "unique_visitors",
    "a"."university",
    "a"."region_of_origin",
    "a"."faculty_group",
    "a"."study_stage",
    "a"."age_group",
    "a"."gender",
    "count"(DISTINCT "v"."user_id") AS "visitors_in_segment",
    "count"(*) AS "scans_in_segment"
   FROM ("public"."stamp_card_visits" "v"
     LEFT JOIN "public"."member_analytics_profiles" "a" ON (("a"."user_id" = "v"."user_id")))
  GROUP BY "v"."restaurant_id", (("date_trunc"('month'::"text", "v"."visited_at"))::"date"), "a"."university", "a"."region_of_origin", "a"."faculty_group", "a"."study_stage", "a"."age_group", "a"."gender";


ALTER VIEW "public"."partner_monthly_insights_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_monthly_insights_owner_view" AS
 SELECT "restaurant_id",
    "report_month",
    "total_scans",
    "unique_visitors",
    "university",
    "region_of_origin",
    "faculty_group",
    "study_stage",
    "age_group",
    "gender",
    "visitors_in_segment",
    "scans_in_segment"
   FROM "public"."partner_monthly_insights_view";


ALTER VIEW "public"."partner_monthly_insights_owner_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stamp_card_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "card_cycle" integer NOT NULL,
    "redeemed" boolean DEFAULT false NOT NULL,
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stamp_card_rewards" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_operations_view" AS
 SELECT "v"."restaurant_id",
    ("v"."visited_at")::"date" AS "scan_date",
    "to_char"("v"."visited_at", 'HH24:MI'::"text") AS "scan_time",
    ("v"."id")::"text" AS "scan_id",
    "v"."card_cycle",
    COALESCE("r"."redeemed", false) AS "reward_redeemed",
    ("r"."id")::"text" AS "reward_id",
    "r"."redeemed_at",
        CASE
            WHEN (COALESCE("r"."redeemed", false) = true) THEN 'Redeemed'::"text"
            WHEN ("r"."id" IS NOT NULL) THEN 'Reward Available'::"text"
            ELSE 'Active'::"text"
        END AS "reward_status"
   FROM ("public"."stamp_card_visits" "v"
     LEFT JOIN "public"."stamp_card_rewards" "r" ON ((("r"."user_id" = "v"."user_id") AND ("r"."restaurant_id" = "v"."restaurant_id") AND ("r"."card_cycle" = "v"."card_cycle"))));


ALTER VIEW "public"."partner_operations_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_operations_owner_view" AS
 SELECT "restaurant_id",
    "scan_date",
    "scan_time",
    "scan_id",
    "card_cycle",
    "reward_redeemed",
    "reward_id",
    "redeemed_at",
    "reward_status"
   FROM "public"."partner_operations_view";


ALTER VIEW "public"."partner_operations_owner_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partnerships" (
    "id" "text" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "master_apps_script_url" "text",
    "name" "text" NOT NULL,
    "partner_sheet_url" "text",
    "partner_apps_script_url" "text"
);


ALTER TABLE "public"."partnerships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."privacy_action_log" (
    "id" bigint NOT NULL,
    "action" "text" NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"(),
    "record_count" integer DEFAULT 0 NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."privacy_action_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."privacy_action_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."privacy_action_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."privacy_action_log_id_seq" OWNED BY "public"."privacy_action_log"."id";



CREATE TABLE IF NOT EXISTS "public"."redemptions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "text",
    "redeemed_at" timestamp with time zone
);


ALTER TABLE "public"."redemptions" OWNER TO "postgres";


ALTER TABLE "public"."redemptions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."redemptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "address" "text",
    "latitude" double precision,
    "longitude" double precision,
    "discount_info" "text",
    "rating" double precision DEFAULT 0,
    "review" "text",
    "reviewer_name" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT '맛집'::"text",
    "price_range" "text" DEFAULT ''::"text",
    "is_sponsored" boolean DEFAULT false,
    "image_urls" "text"[] DEFAULT '{}'::"text"[],
    "discount_terms" "text" DEFAULT ''::"text",
    "map_label" "text" DEFAULT ''::"text",
    "partnership_id" "text",
    "one_line_review" "text",
    "show_rating" boolean DEFAULT true NOT NULL,
    "stamp_card_enabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."restaurants"."one_line_review" IS '한 줄 평가 – shown on SpotCard between photos and 멤버 리뷰';



CREATE TABLE IF NOT EXISTS "public"."review_prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "redemption_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "store_id" "text" NOT NULL,
    "prompt_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_prompts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'submitted'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."review_prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "redemption_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "store_id" "text" NOT NULL,
    "rating" numeric(3,1) NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 0.5) AND ("rating" <= 5.0) AND (("rating" * (2)::numeric) = "floor"(("rating" * (2)::numeric)))))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stamp_card_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "total_stamps" integer DEFAULT 10 NOT NULL,
    "stamps_per_row" integer DEFAULT 5 NOT NULL,
    "title" "text",
    "subtitle" "text",
    "reward_text" "text",
    "accent_color" "text" DEFAULT '#ef4444'::"text" NOT NULL,
    "text_color" "text" DEFAULT '#ffffff'::"text" NOT NULL,
    "wallpaper_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "background_color" "text" DEFAULT '#ffffff'::"text" NOT NULL,
    "stamp_color" "text" DEFAULT '#111827'::"text" NOT NULL
);


ALTER TABLE "public"."stamp_card_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "public"."privacy_action_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."privacy_action_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_analytics_profiles"
    ADD CONSTRAINT "member_analytics_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_student_number_key" UNIQUE ("student_number");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."partnerships"
    ADD CONSTRAINT "partnerships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_action_log"
    ADD CONSTRAINT "privacy_action_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_prompts"
    ADD CONSTRAINT "review_prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_prompts"
    ADD CONSTRAINT "review_prompts_redemption_id_key" UNIQUE ("redemption_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_redemption_id_key" UNIQUE ("redemption_id");



ALTER TABLE ONLY "public"."stamp_card_config"
    ADD CONSTRAINT "stamp_card_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stamp_card_config"
    ADD CONSTRAINT "stamp_card_config_restaurant_id_key" UNIQUE ("restaurant_id");



ALTER TABLE ONLY "public"."stamp_card_rewards"
    ADD CONSTRAINT "stamp_card_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stamp_card_visits"
    ADD CONSTRAINT "stamp_card_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "on_redemption_created" AFTER INSERT ON "public"."redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."create_review_prompt_on_redemption"();



CREATE OR REPLACE TRIGGER "trg_sync_member_analytics_profile" AFTER INSERT OR UPDATE OF "University", "country_of_origin", "major", "education_level", "year_number", "year_of_birth", "gender" ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_member_analytics_profile"();



CREATE OR REPLACE TRIGGER "trg_sync_membership_ended_at" BEFORE INSERT OR UPDATE OF "membership_valid_until" ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_membership_ended_at"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id");



ALTER TABLE ONLY "public"."review_prompts"
    ADD CONSTRAINT "review_prompts_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_prompts"
    ADD CONSTRAINT "review_prompts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."partnerships"("id");



ALTER TABLE ONLY "public"."review_prompts"
    ADD CONSTRAINT "review_prompts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stamp_card_config"
    ADD CONSTRAINT "stamp_card_config_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stamp_card_rewards"
    ADD CONSTRAINT "stamp_card_rewards_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stamp_card_rewards"
    ADD CONSTRAINT "stamp_card_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stamp_card_visits"
    ADD CONSTRAINT "stamp_card_visits_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stamp_card_visits"
    ADD CONSTRAINT "stamp_card_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



CREATE POLICY "Admin can view all members" ON "public"."members" FOR SELECT USING ((("auth"."jwt"() ->> 'email'::"text") = 'admin@uvain.nl'::"text"));



CREATE POLICY "Admin update any member row" ON "public"."members" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Admins delete members" ON "public"."members" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins manage events" ON "public"."events" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins manage restaurants" ON "public"."restaurants" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow public registration insert" ON "public"."members" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anyone can read reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Insert members (self or admin)" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Members or admins read members" ON "public"."members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Members or admins update members" ON "public"."members" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Public can read own admin role" ON "public"."admin_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public can read own member" ON "public"."members" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public can read partnerships" ON "public"."partnerships" FOR SELECT USING (true);



CREATE POLICY "Public read events" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Public read restaurants" ON "public"."restaurants" FOR SELECT USING (true);



CREATE POLICY "Update own member row" ON "public"."members" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own redemptions" ON "public"."redemptions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own prompts" ON "public"."review_prompts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own reviews" ON "public"."reviews" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own prompts" ON "public"."review_prompts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own redemptions" ON "public"."redemptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert own visits" ON "public"."stamp_card_visits" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("added_by_admin" = false)));



ALTER TABLE "public"."member_analytics_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."partnerships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_action_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public read config" ON "public"."stamp_card_config" FOR SELECT USING (true);



CREATE POLICY "read own rewards" ON "public"."stamp_card_rewards" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "read own visits" ON "public"."stamp_card_visits" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stamp_card_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stamp_card_config insert admin" ON "public"."stamp_card_config" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "stamp_card_config select admin" ON "public"."stamp_card_config" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "stamp_card_config select authenticated" ON "public"."stamp_card_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "stamp_card_config update admin" ON "public"."stamp_card_config" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."stamp_card_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stamp_card_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update own rewards" ON "public"."stamp_card_rewards" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "관리자 멤버 삭제" ON "public"."members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 멤버 수정" ON "public"."members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 멤버 추가" ON "public"."members" FOR INSERT WITH CHECK (true);



CREATE POLICY "관리자 본인 확인" ON "public"."admin_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "관리자 식당 삭제" ON "public"."restaurants" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 식당 수정" ON "public"."restaurants" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 식당 추가" ON "public"."restaurants" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 이벤트 삭제" ON "public"."events" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 이벤트 수정" ON "public"."events" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 이벤트 추가" ON "public"."events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "관리자 전체 조회" ON "public"."members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_roles"
  WHERE ("admin_roles"."user_id" = "auth"."uid"()))));



CREATE POLICY "본인 데이터 조회" ON "public"."members" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "식당 공개 조회" ON "public"."restaurants" FOR SELECT USING (true);



CREATE POLICY "이벤트 공개 조회" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "토큰으로 공개 조회" ON "public"."members" FOR SELECT USING (true);



CREATE POLICY "Admin full access profile-images" ON "storage"."objects" TO "authenticated" USING ((("bucket_id" = 'profile-images'::"text") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK ((("bucket_id" = 'profile-images'::"text") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow authenticated uploads to profile-images" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'profile-images'::"text"));



CREATE POLICY "Delete own profile image" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'profile-images'::"text") AND ("owner" = "auth"."uid"())));



CREATE POLICY "Public read profile-images" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'profile-images'::"text"));



CREATE POLICY "Update own profile image" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'profile-images'::"text") AND ("owner" = "auth"."uid"()))) WITH CHECK ((("bucket_id" = 'profile-images'::"text") AND ("owner" = "auth"."uid"())));



CREATE POLICY "Upload own profile image" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'profile-images'::"text") AND ("owner" = "auth"."uid"())));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place images 공개 조회" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'place-images'::"text"));



CREATE POLICY "place images 삭제" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'place-images'::"text"));



CREATE POLICY "place images 업로드" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'place-images'::"text"));



ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "누구나 삭제 가능" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'event-images'::"text"));



CREATE POLICY "누구나 업로드 가능" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'event-images'::"text"));



CREATE POLICY "누구나 조회 가능" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'event-images'::"text"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."anonymize_expired_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."anonymize_expired_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."anonymize_expired_members"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."anonymize_expired_members_for_sheets"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."anonymize_expired_members_for_sheets"() TO "anon";
GRANT ALL ON FUNCTION "public"."anonymize_expired_members_for_sheets"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."anonymize_expired_members_for_sheets"() TO "service_role";



GRANT ALL ON FUNCTION "public"."birth_year_to_age_group"("birth_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."birth_year_to_age_group"("birth_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."birth_year_to_age_group"("birth_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."country_to_region"("country" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."country_to_region"("country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."country_to_region"("country" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_review_prompt_on_redemption"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_review_prompt_on_redemption"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_review_prompt_on_redemption"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."major_to_faculty"("major" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."major_to_faculty"("major" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."major_to_faculty"("major" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."study_stage"("education_level" "text", "year_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."study_stage"("education_level" "text", "year_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."study_stage"("education_level" "text", "year_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_member_analytics_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_member_analytics_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_member_analytics_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_membership_ended_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_membership_ended_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_membership_ended_at"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_roles" TO "anon";
GRANT ALL ON TABLE "public"."admin_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_roles" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."member_analytics_profiles" TO "anon";
GRANT ALL ON TABLE "public"."member_analytics_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."member_analytics_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."stamp_card_visits" TO "anon";
GRANT ALL ON TABLE "public"."stamp_card_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."stamp_card_visits" TO "service_role";



GRANT ALL ON TABLE "public"."partner_monthly_insights_view" TO "anon";
GRANT ALL ON TABLE "public"."partner_monthly_insights_view" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_monthly_insights_view" TO "service_role";



GRANT ALL ON TABLE "public"."partner_monthly_insights_owner_view" TO "anon";
GRANT ALL ON TABLE "public"."partner_monthly_insights_owner_view" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_monthly_insights_owner_view" TO "service_role";



GRANT ALL ON TABLE "public"."stamp_card_rewards" TO "anon";
GRANT ALL ON TABLE "public"."stamp_card_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."stamp_card_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."partner_operations_view" TO "anon";
GRANT ALL ON TABLE "public"."partner_operations_view" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_operations_view" TO "service_role";



GRANT ALL ON TABLE "public"."partner_operations_owner_view" TO "anon";
GRANT ALL ON TABLE "public"."partner_operations_owner_view" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_operations_owner_view" TO "service_role";



GRANT ALL ON TABLE "public"."partnerships" TO "anon";
GRANT ALL ON TABLE "public"."partnerships" TO "authenticated";
GRANT ALL ON TABLE "public"."partnerships" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_action_log" TO "anon";
GRANT ALL ON TABLE "public"."privacy_action_log" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_action_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."privacy_action_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."privacy_action_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."privacy_action_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."redemptions" TO "anon";
GRANT ALL ON TABLE "public"."redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."redemptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."redemptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."redemptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."redemptions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



GRANT ALL ON TABLE "public"."review_prompts" TO "anon";
GRANT ALL ON TABLE "public"."review_prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."review_prompts" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."stamp_card_config" TO "anon";
GRANT ALL ON TABLE "public"."stamp_card_config" TO "authenticated";
GRANT ALL ON TABLE "public"."stamp_card_config" TO "service_role";



REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




