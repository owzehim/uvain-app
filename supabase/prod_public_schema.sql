


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



CREATE OR REPLACE TRIGGER "on_redemption_created" AFTER INSERT ON "public"."redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."create_review_prompt_on_redemption"();



CREATE OR REPLACE TRIGGER "trg_sync_member_analytics_profile" AFTER INSERT OR UPDATE OF "University", "country_of_origin", "major", "education_level", "year_number", "year_of_birth", "gender" ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_member_analytics_profile"();



CREATE OR REPLACE TRIGGER "trg_sync_membership_ended_at" BEFORE INSERT OR UPDATE OF "membership_valid_until" ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."sync_membership_ended_at"();



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



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



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







