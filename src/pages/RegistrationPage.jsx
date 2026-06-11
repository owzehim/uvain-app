// src/pages/RegistrationPage.jsx
//
// Presentation only — all logic lives in useRegisterMember hook.
// ❌ Do NOT copy to React Native — rewrite UI with RN components.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterMember } from '../hooks/useRegisterMember';
import { getYearOptions } from '../domain/member/memberRegistration';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia',
  'Cuba', 'Cyprus', 'Czech Republic', 'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
  'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago',
  'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

const GENDERS = ['female', 'male', 'non-binary', 'prefer not to say'];
const GENDERS_KO = ['여성', '남성', '논바이너리', '답변 거절'];
const UNIVERSITY_OPTIONS = ['University of Amsterdam (UvA)'];
const MAJOR_OPTIONS = [
  'Business Administration',
  'Business Analytics',
  'Communication Science',
  'Econometrics and Data Science',
  'Economics and Business Economics',
  'Global Arts, Culture and Politics',
  'Media and Information',
  'Sport and Performance Psychology',
];

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.localeCompare(b));
const SORTED_GENDERS = [...GENDERS].sort((a, b) => a.localeCompare(b));
const SORTED_GENDERS_KO = [...GENDERS_KO].sort((a, b) => a.localeCompare(b, 'ko'));
const SORTED_UNIVERSITIES = [...UNIVERSITY_OPTIONS].sort((a, b) => a.localeCompare(b));
const SORTED_MAJORS = [...MAJOR_OPTIONS].sort((a, b) => a.localeCompare(b));

// ── Translations ────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Account Register',
    subtitle: 'Your membership will be inactive after registration. The board will activate it once verified.',
    aboutYou: 'About you',
    academicInfo: 'Academic information',
    finalStep: 'Final step',
    firstName: 'First name (English) *',
    lastName: 'Last name (English) *',
    firstNameKorean: 'First name (Korean) *',
    lastNameKorean: 'Last name (Korean) *',
    yearOfBirth: 'Year of birth (optional)',
    gender: 'Gender *',
    nationality: 'Nationality *',
    university: 'University *',
    major: 'Major *',
    programme: 'Programme *',
    academicYear: 'Academic year *',
    email: 'Email *',
    password: 'Password *',
    confirmPassword: 'Confirm password *',
    profilePicture: 'Profile picture (optional)',
    next: 'Next →',
    back: '← Back',
    createAccount: 'Create account',
    creatingAccount: 'Creating account…',
    requiredFields: '* Required fields',
    passwordMismatch: '⚠️ Passwords do not match',
    checkEmail: 'Check your email',
    emailSent: 'We sent a confirmation link to',
    verifyEmail: 'Please open that email, verify your address, then come back and log in.',
    goToLogin: 'Go to login',
    alreadyHaveAccount: 'Already have an account?',
    logIn: 'Log in',
    minCharacters: 'Min. 6 characters',
    selectGender: 'Select gender',
    selectNationality: 'Select nationality',
    selectUniversity: 'Select university',
    selectMajor: 'Select major',
    selectYear: 'Select year',
    year: 'Year',
    foundation: 'Foundation',
    bachelor: 'Bachelor',
    master: 'Master',
    alumni: 'Alumni',
  },
  ko: {
    title: '계정 등록',
    subtitle: '등록 후 회원 자격은 비활성 상태입니다. 보드에서 확인 후 활성화됩니다.',
    aboutYou: '당신에 대해',
    academicInfo: '학력 정보',
    finalStep: '마지막 단계',
    firstName: '이름 (영문) *',
    lastName: '성 (영문) *',
    firstNameKorean: '이름 (한글) *',
    lastNameKorean: '성 (한글) *',
    yearOfBirth: '출생 연도 (선택사항)',
    gender: '성별 *',
    nationality: '국적 *',
    university: '대학 *',
    major: '전공 *',
    programme: '프로그램 *',
    academicYear: '학년 *',
    email: '이메일 *',
    password: '비밀번호 *',
    confirmPassword: '비밀번호 확인 *',
    profilePicture: '프로필 사진 (선택사항)',
    next: '다음 →',
    back: '← 뒤로',
    createAccount: '계정 만들기',
    creatingAccount: '계정 생성 중…',
    requiredFields: '* 필수 필드',
    passwordMismatch: '⚠️ 비밀번호가 일치하지 않습니다',
    checkEmail: '이메일 확인',
    emailSent: '확인 링크를 다음 주소로 보냈습니다',
    verifyEmail: '해당 이메일을 열고 주소를 확인한 후 돌아와서 로그인하세요.',
    goToLogin: '로그인으로 이동',
    alreadyHaveAccount: '이미 계정이 있으신가요?',
    logIn: '로그인',
    minCharacters: '최소 6자',
    selectGender: '성별 선택',
    selectNationality: '국적 선택',
    selectUniversity: '대학 선택',
    selectMajor: '전공 선택',
    selectYear: '학년 선택',
    year: '학년',
    foundation: '파운데이션',
    bachelor: '학사',
    master: '석사',
    alumni: '동문',
  },
};

// ── Typeahead select component ────────────────────────────────────────────────
function TypeaheadSelect({ name, value, onChange, options, placeholder = '' }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (val) => {
    setInputValue(val);
    setOpen(false);
    onChange({ target: { name, value: val } });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setOpen(true);
    if (val === '') {
      onChange({ target: { name, value: '' } });
    }
  };

  return (
    <div ref={containerRef} style={s.typeaheadContainer}>
      <input
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={s.input}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={s.typeaheadList}>
          {filtered.map((opt) => (
            <div
              key={opt}
              style={s.typeaheadItem}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RegistrationPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');

  const {
    step,
    formData,
    loading,
    error,
    handleChange,
    handleEducationLevelChange,
    handleSubmit,
    goNext,
    goBack,
    setProfileFile,
  } = useRegisterMember();

  const yearOptions = getYearOptions(formData.educationLevel);
  const t = translations[language];
  const genderOptions = language === 'en' ? SORTED_GENDERS : SORTED_GENDERS_KO;

  // Final step: after successful registration, tell user to check email
  if (step === 'email') {
    return (
      <div style={{ ...s.page, fontFamily: '"Noto Sans KR", sans-serif' }}>
        <div style={s.topBar}>
          <button
            type="button"
            onClick={() => navigate('/public')}
            style={s.backButton}
            title="Go back"
          >
            ←
          </button>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            style={s.languageToggle}
          >
            {language === 'en' ? '한국어' : 'English'}
          </button>
        </div>
        <div style={s.emailCard}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
            <h1 style={s.title}>{t.checkEmail}</h1>
            <p style={s.emailText}>
              {t.emailSent} <br />
              <strong style={{ color: '#111827' }}>{formData.email}</strong>
              <br />
              {t.verifyEmail}
            </p>
          </div>
          <button type="button" onClick={() => navigate('/login')} style={s.submitBtn}>
            {t.goToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.page, fontFamily: '"Noto Sans KR", sans-serif' }}>
      {/* Top Bar with Back Button and Language Toggle */}
      <div style={s.topBar}>
        <button
          type="button"
          onClick={() => navigate('/public')}
          style={s.backButton}
          title="Go back"
        >
          ←
        </button>
        <button
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          style={s.languageToggle}
        >
          {language === 'en' ? '한국어' : 'English'}
        </button>
      </div>

      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>{t.title}</h1>
        <p style={s.subtitle}>{t.subtitle}</p>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {step === 'about' && (
        <AboutStep
          formData={formData}
          handleChange={handleChange}
          goNext={goNext}
          language={language}
          t={t}
        />
      )}

      {step === 'academic' && (
        <AcademicStep
          formData={formData}
          handleChange={handleChange}
          handleEducationLevelChange={handleEducationLevelChange}
          yearOptions={yearOptions}
          goNext={goNext}
          goBack={goBack}
          language={language}
          t={t}
        />
      )}

      {step === 'account' && (
        <AccountStep
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          goBack={goBack}
          loading={loading}
          navigate={navigate}
          setProfileFile={setProfileFile}
          language={language}
          t={t}
        />
      )}

      <p style={s.note}>{t.requiredFields}</p>
    </div>
  );
}

// ── Step 1: About you ──────────────────────────────────────────────────────────
function AboutStep({ formData, handleChange, goNext, language, t }) {
  const isComplete =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    (language === 'en' || (formData.firstNameKorean?.trim() && formData.lastNameKorean?.trim())) &&
    formData.gender &&
    formData.countryOfOrigin;

  return (
    <div style={s.form}>
      <SectionTitle>{t.aboutYou}</SectionTitle>

      <Row>
        <Field label={t.firstName}>
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
        <Field label={t.lastName}>
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
      </Row>

      {language === 'ko' && (
        <Row>
          <Field label={t.firstNameKorean}>
            <input
              name="firstNameKorean"
              value={formData.firstNameKorean || ''}
              onChange={handleChange}
              style={s.input}
            />
          </Field>
          <Field label={t.lastNameKorean}>
            <input
              name="lastNameKorean"
              value={formData.lastNameKorean || ''}
              onChange={handleChange}
              style={s.input}
            />
          </Field>
        </Row>
      )}

      <Row>
        <Field label={t.yearOfBirth}>
          <input
            type="number"
            name="yearOfBirth"
            value={formData.yearOfBirth}
            onChange={handleChange}
            style={s.input}
            placeholder="2004"
            min="1950"
            max="2015"
          />
        </Field>
        <Field label={t.gender}>
          <TypeaheadSelect
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={language === 'en' ? SORTED_GENDERS : SORTED_GENDERS_KO}
            placeholder={t.selectGender}
          />
        </Field>
      </Row>

      <Field label={t.nationality}>
        <TypeaheadSelect
          name="countryOfOrigin"
          value={formData.countryOfOrigin}
          onChange={handleChange}
          options={SORTED_COUNTRIES}
          placeholder={t.selectNationality}
        />
      </Field>

      <button
        type="button"
        onClick={goNext}
        disabled={!isComplete}
        style={{
          ...s.submitBtn,
          opacity: isComplete ? 1 : 0.5,
          cursor: isComplete ? 'pointer' : 'not-allowed',
        }}
      >
        {t.next}
      </button>
    </div>
  );
}

// ── Step 2: Academic info ──────────────────────────────────────────────────────
function AcademicStep({
  formData,
  handleChange,
  handleEducationLevelChange,
  yearOptions,
  goNext,
  goBack,
  language,
  t,
}) {
  const isComplete =
    formData.university &&
    formData.major &&
    formData.educationLevel &&
    (yearOptions.length === 0 || formData.yearNumber);

  const programmeOptions = ['foundation', 'bachelor', 'master', 'alumni'];

  return (
    <div style={s.form}>
      <SectionTitle>{t.academicInfo}</SectionTitle>

      <Row>
        <Field label={t.university}>
          <TypeaheadSelect
            name="university"
            value={formData.university}
            onChange={handleChange}
            options={SORTED_UNIVERSITIES}
            placeholder={t.selectUniversity}
          />
        </Field>
        <Field label={t.major}>
          <TypeaheadSelect
            name="major"
            value={formData.major}
            onChange={handleChange}
            options={SORTED_MAJORS}
            placeholder={t.selectMajor}
          />
        </Field>
      </Row>

      <Field label={t.programme}>
        <div style={s.radioGroup}>
          {programmeOptions.map((level) => (
            <label key={level} style={s.radioLabel}>
              <input
                type="radio"
                name="educationLevel"
                value={level}
                checked={formData.educationLevel === level}
                onChange={handleEducationLevelChange}
              />
              {t[level]}
            </label>
          ))}
        </div>
      </Field>

      {yearOptions.length > 0 && (
        <Field label={t.academicYear}>
          <select
            name="yearNumber"
            value={formData.yearNumber}
            onChange={handleChange}
            style={s.select}
          >
            <option value="">{t.selectYear}</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {t.year} {y}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          type="button"
          onClick={goBack}
          style={{ ...s.ghostBtn, flex: 1 }}
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!isComplete}
          style={{
            ...s.submitBtn,
            flex: 1,
            opacity: isComplete ? 1 : 0.5,
            cursor: isComplete ? 'pointer' : 'not-allowed',
          }}
        >
          {t.next}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Account & login info ───────────────────────────────────────────────
function AccountStep({
  formData,
  handleChange,
  handleSubmit,
  goBack,
  loading,
  navigate,
  setProfileFile,
  language,
  t,
}) {
  const isComplete =
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword &&
    formData.password.length >= 6;

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      <SectionTitle>{t.finalStep}</SectionTitle>

      <Field label={t.email}>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          style={s.input}
          placeholder="your.name@student.uva.nl"
        />
      </Field>

      <Row>
        <Field label={t.password}>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            style={s.input}
            placeholder={t.minCharacters}
          />
        </Field>
        <Field label={t.confirmPassword}>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
      </Row>

      {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
        <p style={{ ...s.helperText, color: '#dc2626' }}>
          {t.passwordMismatch}
        </p>
      )}

      <Field label={t.profilePicture}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            setProfileFile(file || null);
          }}
          style={s.input}
        />
      </Field>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          type="button"
          onClick={goBack}
          style={{ ...s.ghostBtn, flex: 1 }}
        >
          {t.back}
        </button>
        <button
          type="submit"
          disabled={loading || !isComplete}
          style={{
            ...s.submitBtn,
            flex: 1,
            opacity: loading || !isComplete ? 0.6 : 1,
            cursor: loading || !isComplete ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? t.creatingAccount : t.createAccount}
        </button>
      </div>

      <p style={s.loginPrompt}>
        {t.alreadyHaveAccount}{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={s.linkBtn}
        >
          {t.logIn}
        </button>
      </p>
    </form>
  );
}

// ── Small layout helpers ───────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <p style={sectionTitleStyle}>{children}</p>;
}

function Row({ children }) {
  return <div style={rowStyle}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const sectionTitleStyle = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#9ca3af',
  marginBottom: '-4px',
  marginTop: '4px',
};

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
};

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: '0',
  },
  topBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#374151',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  languageToggle: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  header: {
    width: '100%',
    textAlign: 'center',
    padding: '40px 32px 20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 12px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.6,
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '20px',
    padding: '32px',
    backgroundColor: 'white',
    borderRadius: '0',
    maxWidth: '800px',
    width: '100%',
    margin: '20px auto',
  },
  input: {
    padding: '9px 11px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '9px 11px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: 'white',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    marginTop: '4px',
    flexWrap: 'wrap',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '11px',
    borderRadius: '9999px',
    border: 'none',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: 'white',
    fontSize: '15px',
    fontWeight: 600,
    width: '100%',
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '10px 12px',
    margin: '20px auto',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    fontSize: '13px',
    maxWidth: '800px',
    width: '100%',
  },
  loginPrompt: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#6b7280',
    margin: '4px 0 0',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#f97316',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
  },
  ghostBtn: {
    background: '#f3f4f6',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    padding: '10px',
    color: '#4b5563',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 500,
  },
  note: {
    marginTop: '16px',
    marginBottom: '40px',
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'center',
  },
  helperText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  typeaheadContainer: {
    position: 'relative',
  },
  typeaheadList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: '180px',
    overflowY: 'auto',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
    marginTop: '4px',
    zIndex: 20,
    border: '1px solid #e5e7eb',
  },
  typeaheadItem: {
    padding: '8px 10px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#374151',
  },
  emailCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)',
    padding: '32px',
    maxWidth: '420px',
    width: '100%',
    margin: '60px auto',
  },
  emailText: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.6,
    margin: 0,
  },
};