// ─────────────────────────────────────────────────────────────────────────────
// src/api/memberRepository.js
//
// All Supabase calls for member registration.
// ✅ Copy this file as-is into your future React Native project
// (Supabase JS client works in React Native too).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase';

/**
 * Creates a Supabase Auth account AND inserts a members row.
 * The member starts with is_member = false (pending activation).
 *
 * @param {{
 *  email: string,
 *  password: string,
 *  firstName: string,
 *  lastName: string,
 *  studentNumber: string,
 *  yearOfBirth: number | null,
 *  gender: string,
 *  countryOfOrigin: string,
 *  university: string,
 *  major: string,
 *  educationLevel: 'foundation' | 'bachelor' | 'master' | 'alumni',
 *  yearNumber: number | null,
 *  profileImageUrl?: string | null,
 * }} payload
 *
 * @returns {Promise<{ userId: string, memberId: string }>}
 */
export async function registerMember(payload) {
  const {
    email,
    password,
    firstName,
    lastName,
    studentNumber,
    yearOfBirth,
    gender,
    countryOfOrigin,
    university,
    major,
    educationLevel,
    yearNumber,
    profileImageUrl,
  } = payload;

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // You can pass extra metadata here if needed
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error(
      'Account was created but user ID is missing. Please contact support.'
    );
  }

  // Step 2: Insert members row linked to the auth user
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .insert([
      {
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        student_number: studentNumber,
        year_of_birth: yearOfBirth || null,
        gender,
        country_of_origin: countryOfOrigin,
        University: university,
        major,
        education_level: educationLevel,
        year_number: educationLevel !== 'alumni' ? yearNumber : null,
        is_member: false, // starts inactive — you activate manually
        session_token: null,
        profile_image_url: profileImageUrl || null,
      },
    ])
    .select('id')
    .single();

  if (memberError) {
    // Auth user was created but members insert failed.
    // Log it — you may want to clean up the auth user or retry.
    console.error(
      'Members insert failed after auth signup:',
      memberError
    );
    throw new Error(memberError.message);
  }

  return { userId, memberId: memberData.id };
}