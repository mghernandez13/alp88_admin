


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


COMMENT ON SCHEMA "public" IS '@graphql({"max_rows_per_query": 100, "expose": true})';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'super_admin',
    'admin',
    'main_agent',
    'team_leader',
    'agent',
    'encoder'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reset_password"("target_user_id" "uuid", "new_password" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_user_role text;
begin
  -- 1. Fetch the role of the person currently logged in (auth.uid())
  select role into current_user_role 
  from public.profiles 
  where id = auth.uid();

  -- 2. Security Check: Is the caller an admin OR a super_admin?
  if current_user_role not in ('admin', 'super_admin') then
    raise exception 'Unauthorized: Only administrators can reset passwords.';
  end if;

  -- 3. Perform the update in the internal auth.users table
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;

  return 'Password updated successfully';
end;
$$;


ALTER FUNCTION "public"."admin_reset_password"("target_user_id" "uuid", "new_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_user_email"("target_user_id" "uuid", "new_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$declare
  user_permissions text[];
begin
  -- 1. Security Check
   select p.permissions
    into user_permissions
    from public.profiles pr
    join permissions p on pr.permission_id = p.id
   where pr.id = auth.uid();
  if user_permissions is null or
     not (
       'Can Login to Admin' = any(user_permissions) or
       'Add Agents' = any(user_permissions) or
       'Edit Agents' = any(user_permissions)
     ) then
    raise exception 'Unauthorized';
  end if;

  -- 2. Email Format Validation (Regex)
  -- Checks for: characters + @ + characters + . + characters
  if new_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid email format: %', new_email;
  end if;

  -- 3. Update the Auth Table
  update auth.users
  set email = new_email,
      email_confirmed_at = now(),
      updated_at = now()
  where id = target_user_id;

  -- 4. Update the Profiles Table
  update public.profiles
  set email = new_email
  where id = target_user_id;

  return 'Email updated successfully';
end;$_$;


ALTER FUNCTION "public"."admin_update_user_email"("target_user_id" "uuid", "new_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, avatar_url, permission_id, is_quota_based, upline)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email, 
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'permission_id')::uuid,
    (new.raw_user_meta_data->>'is_quota_based')::boolean,
    (new.raw_user_meta_data->>'upline')::uuid
  );
  RETURN new;
END;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role"("user_id" "uuid", "new_permission_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    raw_app_meta_data || jsonb_build_object('permission_id', new_permission_id)
  WHERE id = user_id;
END;$$;


ALTER FUNCTION "public"."set_user_role"("user_id" "uuid", "new_permission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  _permission_list text[];
BEGIN
  -- 1. Fetch the string array from the permissions table
  SELECT permissions 
  INTO _permission_list
  FROM public.permissions 
  WHERE id = NEW.permission_id;

  -- 2. Update auth.users with the combined metadata
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'avatar_url', NEW.avatar_url, 
        'full_name', NEW.full_name, 
        'status', NEW.status, 
        'permission_id', NEW.permission_id, 
        'upline', NEW.upline,
        'permissions', to_jsonb(_permission_list)
      )
  WHERE id = NEW.id;

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."sync_profile_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_metadata_on_permission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  -- Update all users who have this specific permission_id
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object('permissions', to_jsonb(NEW.permissions))
  WHERE id IN (
    SELECT id FROM public.profiles WHERE permission_id = NEW.id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_metadata_on_permission_change"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bet_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "draw_time" time without time zone,
    "code" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bet_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."bet_types" IS '@graphql({"totalCount": {"enabled": true}})';



CREATE OR REPLACE FUNCTION "public"."update_bet_types_status"("bet_type_ids" "uuid"[], "new_status" boolean) RETURNS SETOF "public"."bet_types"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE public.bet_types
  SET is_archive = new_status
  WHERE id = ANY(bet_type_ids)
  RETURNING *;
$$;


ALTER FUNCTION "public"."update_bet_types_status"("bet_type_ids" "uuid"[], "new_status" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lotto_types" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "game_type" "text" NOT NULL,
    "draw_time" time without time zone,
    "days_active" character varying[],
    "number_of_digits" numeric NOT NULL,
    "min_number" numeric NOT NULL,
    "max_number" numeric NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_archive" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."lotto_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."lotto_types" IS '@graphql({"totalCount": {"enabled": true}})';



CREATE OR REPLACE FUNCTION "public"."update_lotto_types_status"("lotto_type_ids" integer[], "new_status" boolean) RETURNS SETOF "public"."lotto_types"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE public.lotto_types
  SET is_archive = new_status
  WHERE id = ANY(lotto_type_ids)
  RETURNING *;
$$;


ALTER FUNCTION "public"."update_lotto_types_status"("lotto_type_ids" integer[], "new_status" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_metadata_from_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  _permission_list text[];
BEGIN
  -- 1. Fetch the string array
  SELECT permissions 
  INTO _permission_list
  FROM public.permissions 
  WHERE id = NEW.permission_id;

  -- 2. Update auth.users
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'avatar_url', NEW.avatar_url, 
        'full_name', NEW.full_name, 
        'status', NEW.status, 
        'permission_id', NEW.permission_id, 
        'upline', NEW.upline,
        'permissions', to_jsonb(_permission_list)
      )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_metadata_from_profile"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "public"."user_role" DEFAULT 'agent'::"public"."user_role",
    "first_name" "text",
    "last_name" "text",
    "status" boolean DEFAULT true NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "full_name" "text" GENERATED ALWAYS AS ((("first_name" || ' '::"text") || "last_name")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "is_quota_based" boolean DEFAULT false,
    "upline" "uuid",
    "permission_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS '@graphql({"totalCount": {"enabled": true}})';



COMMENT ON COLUMN "public"."profiles"."first_name" IS 'First name of the user';



COMMENT ON COLUMN "public"."profiles"."last_name" IS 'Last Name of the User';



COMMENT ON COLUMN "public"."profiles"."status" IS 'Account Login Status';



COMMENT ON COLUMN "public"."profiles"."is_archive" IS 'Account if conditionally deleted';



COMMENT ON COLUMN "public"."profiles"."created_at" IS 'Date Created';



COMMENT ON COLUMN "public"."profiles"."updated_at" IS 'Date Updated';



COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'Profile image of the user';



COMMENT ON COLUMN "public"."profiles"."is_quota_based" IS 'Is the agent quota based?';



COMMENT ON COLUMN "public"."profiles"."upline" IS 'Upline''s User Id';



CREATE OR REPLACE FUNCTION "public"."update_user_statuses"("user_ids" "uuid"[], "new_status" boolean) RETURNS SETOF "public"."profiles"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE public.profiles
  SET is_archive = new_status
  WHERE id = ANY(user_ids)
  RETURNING *;
$$;


ALTER FUNCTION "public"."update_user_statuses"("user_ids" "uuid"[], "new_status" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bet_prizes" (
    "id" bigint NOT NULL,
    "lotto_type_id" bigint NOT NULL,
    "bet_amount" double precision NOT NULL,
    "prize" double precision NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bet_prizes" OWNER TO "postgres";


COMMENT ON TABLE "public"."bet_prizes" IS '@graphql({"totalCount": {"enabled": true}})';



ALTER TABLE "public"."bet_prizes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bet_prizes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."bets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lotto_type_id" bigint NOT NULL,
    "bet_type_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "combination" "text" NOT NULL,
    "bet_amount" double precision NOT NULL,
    "agent_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hit" boolean,
    "bet_prize_id" bigint,
    "is_archive" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_dummy_bet" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."bets" OWNER TO "postgres";


COMMENT ON TABLE "public"."bets" IS '@graphql({"totalCount": {"enabled": true}})';



CREATE TABLE IF NOT EXISTS "public"."draw_results" (
    "id" bigint NOT NULL,
    "draw_date" "date" NOT NULL,
    "draw_type" bigint NOT NULL,
    "combination" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_archive" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."draw_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."draw_results" IS '@graphql({"totalCount": {"enabled": true}})';



ALTER TABLE "public"."draw_results" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."draw_results_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."lotto_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."lotto_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "permissions" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_archive" boolean DEFAULT false,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."permissions" IS '@graphql({"totalCount": {"enabled": true}})';



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "value" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


ALTER TABLE "public"."settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."bet_prizes"
    ADD CONSTRAINT "bet_prizes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bet_types"
    ADD CONSTRAINT "bet_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bets"
    ADD CONSTRAINT "bets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."draw_results"
    ADD CONSTRAINT "draw_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lotto_types"
    ADD CONSTRAINT "lotto_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "on_permission_updated" AFTER UPDATE OF "permissions" ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_metadata_on_permission_change"();



CREATE OR REPLACE TRIGGER "on_profile_updated" AFTER INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_metadata_from_profile"();



ALTER TABLE ONLY "public"."bet_prizes"
    ADD CONSTRAINT "bet_prizes_lotto_type_id_fkey" FOREIGN KEY ("lotto_type_id") REFERENCES "public"."lotto_types"("id");



ALTER TABLE ONLY "public"."bets"
    ADD CONSTRAINT "bets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."bets"
    ADD CONSTRAINT "bets_bet_prize_id_fkey" FOREIGN KEY ("bet_prize_id") REFERENCES "public"."bet_prizes"("id");



ALTER TABLE ONLY "public"."bets"
    ADD CONSTRAINT "bets_bet_type_id_fkey" FOREIGN KEY ("bet_type_id") REFERENCES "public"."bet_types"("id");



ALTER TABLE ONLY "public"."bets"
    ADD CONSTRAINT "bets_lotto_type_id_fkey" FOREIGN KEY ("lotto_type_id") REFERENCES "public"."lotto_types"("id");



ALTER TABLE ONLY "public"."draw_results"
    ADD CONSTRAINT "draw_results_draw_type_fkey" FOREIGN KEY ("draw_type") REFERENCES "public"."lotto_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE RESTRICT;



CREATE POLICY "Admin Full Access" ON "public"."bet_prizes" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Bet Prizes"]'::"jsonb"));



CREATE POLICY "Admin Full Access" ON "public"."bet_types" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Bet Types"]'::"jsonb"));



CREATE POLICY "Admin Full Access" ON "public"."draw_results" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Results"]'::"jsonb"));



CREATE POLICY "Admin Full Access" ON "public"."lotto_types" TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Lotto Types"]'::"jsonb"));



CREATE POLICY "Admin Full Access" ON "public"."permissions" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'permission_id'::"text") IS NOT NULL));



CREATE POLICY "Admin full access" ON "public"."profiles" TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Agents"]'::"jsonb"));



CREATE POLICY "Admin full permission" ON "public"."settings" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Configuration"]'::"jsonb"));



CREATE POLICY "Full Admin Access" ON "public"."bets" USING (((("auth"."jwt"() -> 'user_metadata'::"text") -> 'permissions'::"text") @> '["View Bets"]'::"jsonb"));



ALTER TABLE "public"."bet_prizes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bet_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."draw_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lotto_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."admin_reset_password"("target_user_id" "uuid", "new_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_reset_password"("target_user_id" "uuid", "new_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reset_password"("target_user_id" "uuid", "new_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_user_email"("target_user_id" "uuid", "new_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_user_email"("target_user_id" "uuid", "new_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user_email"("target_user_id" "uuid", "new_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_role"("user_id" "uuid", "new_permission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_role"("user_id" "uuid", "new_permission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_role"("user_id" "uuid", "new_permission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_metadata_on_permission_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_metadata_on_permission_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_metadata_on_permission_change"() TO "service_role";



GRANT ALL ON TABLE "public"."bet_types" TO "anon";
GRANT ALL ON TABLE "public"."bet_types" TO "authenticated";
GRANT ALL ON TABLE "public"."bet_types" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bet_types_status"("bet_type_ids" "uuid"[], "new_status" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_bet_types_status"("bet_type_ids" "uuid"[], "new_status" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bet_types_status"("bet_type_ids" "uuid"[], "new_status" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."lotto_types" TO "anon";
GRANT ALL ON TABLE "public"."lotto_types" TO "authenticated";
GRANT ALL ON TABLE "public"."lotto_types" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lotto_types_status"("lotto_type_ids" integer[], "new_status" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_lotto_types_status"("lotto_type_ids" integer[], "new_status" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lotto_types_status"("lotto_type_ids" integer[], "new_status" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_metadata_from_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_metadata_from_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_metadata_from_profile"() TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_statuses"("user_ids" "uuid"[], "new_status" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_statuses"("user_ids" "uuid"[], "new_status" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_statuses"("user_ids" "uuid"[], "new_status" boolean) TO "service_role";


















GRANT ALL ON TABLE "public"."bet_prizes" TO "anon";
GRANT ALL ON TABLE "public"."bet_prizes" TO "authenticated";
GRANT ALL ON TABLE "public"."bet_prizes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bet_prizes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bet_prizes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bet_prizes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bets" TO "anon";
GRANT ALL ON TABLE "public"."bets" TO "authenticated";
GRANT ALL ON TABLE "public"."bets" TO "service_role";



GRANT ALL ON TABLE "public"."draw_results" TO "anon";
GRANT ALL ON TABLE "public"."draw_results" TO "authenticated";
GRANT ALL ON TABLE "public"."draw_results" TO "service_role";



GRANT ALL ON SEQUENCE "public"."draw_results_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."draw_results_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."draw_results_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."lotto_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lotto_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lotto_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "service_role";









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































