// src/pages/RegistrationPage.jsx
//
// Presentation only — all logic lives in useRegisterMember hook.
// ❌ Do NOT copy to React Native — rewrite UI with RN components.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, UserCircle } from '@phosphor-icons/react';
import Cropper from 'react-easy-crop';
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

const PASTEL_COLORS = [
  '#FFB3B3',
  '#FFD9A0',
  '#FFF3A0',
  '#B3F0C2',
  '#A8D8FF',
  '#C5B3FF',
  '#FFB3E6',
  '#B3F0EE',
];

function getPastelColor(seed) {
  const str = seed || 'default';
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

async function getCroppedImgAsFile(imageSrc, pixelCrop, fileName = 'profile.jpg') {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSrc;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  canvas
    .getContext('2d')
    .drawImage(
      img,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(result);
    }, 'image/jpeg', 0.95);
  });

  return new File([blob], fileName, { type: 'image/jpeg' });
}

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
    studentNumber: 'Student number *',
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
    master: 'Masters',
    alumni: 'Alumni',
  },
  ko: {
    title: '회원가입',
    subtitle: '등록 후 회원 자격은 비활성 상태입니다. 임원이 확인 후 활성화됩니다.',
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
    studentNumber: '학번 *',
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
    foundation: 'Foundation',
    bachelor: 'Bachelor',
    master: 'Masters',
    alumni: 'Alumni',
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
  const [language, setLanguage] = useState('ko');

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

      {error && <div style={s.errorBanner}>{error}</div>}

      {step === 'about' && (
        <AboutStep
          formData={formData}
          handleChange={handleChange}
          goNext={goNext}
          setProfileFile={setProfileFile}
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
          t={t}
        />
      )}

      <p style={s.note}>{t.requiredFields}</p>
    </div>
  );
}

// ── Step 1: About you ──────────────────────────────────────────────────────────
function AboutStep({ formData, handleChange, goNext, setProfileFile, language, t }) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropFileName, setCropFileName] = useState('profile.jpg');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const avatarSeed = `${formData.firstName || ''}${formData.lastName || ''}`;
  const pastelBg = getPastelColor(avatarSeed);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setCropFileName(file.name || 'profile.jpg');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    const croppedFile = await getCroppedImgAsFile(cropImageSrc, croppedAreaPixels, cropFileName);
    setProfileFile(croppedFile);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(croppedFile);
    });
    setCropImageSrc(null);
    setCroppedAreaPixels(null);
  };

  const closeCropper = () => {
    setCropImageSrc(null);
    setCroppedAreaPixels(null);
  };

  return (
    <div style={s.form}>
      <h1 style={s.formTitle}>{t.title}</h1>

      <div style={s.aboutTopGrid}>
        <div style={s.profilePicker}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={s.avatarButton}
            aria-label={t.profilePicture}
          >
            <div
              style={{
                ...s.avatarCircle,
                background: previewUrl ? 'transparent' : pastelBg,
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Profile" style={s.avatarImage} />
              ) : (
                <>
                  <UserCircle size="72%" weight="fill" color="rgba(44,42,39,0.55)" />
                  <span style={s.avatarText}>프로필</span>
                </>
              )}
            </div>
            <span style={s.cameraBadge}>
              <Camera size={18} weight="fill" color="#fff" />
            </span>
          </button>
        </div>

        <div style={s.nameGrid}>
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
          {language === 'ko' && (
            <>
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
            </>
          )}
        </div>
      </div>

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
        style={{
          ...s.submitBtn,
        }}
      >
        {t.next}
      </button>

      {cropImageSrc && (
        <ProfileCropModal
          imageSrc={cropImageSrc}
          crop={crop}
          zoom={zoom}
          setCrop={setCrop}
          setZoom={setZoom}
          setCroppedAreaPixels={setCroppedAreaPixels}
          onCancel={closeCropper}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

function ProfileCropModal({
  imageSrc,
  crop,
  zoom,
  setCrop,
  setZoom,
  setCroppedAreaPixels,
  onCancel,
  onConfirm,
}) {
  return (
    <div style={s.cropOverlay}>
      <div style={s.cropModal}>
        <h2 style={s.cropTitle}>프로필 사진 자르기</h2>
        <div style={s.cropFrame}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={s.zoomSlider}
        />
        <div style={s.cropActions}>
          <button type="button" onClick={onCancel} style={s.cropCancelBtn}>
            취소
          </button>
          <button type="button" onClick={onConfirm} style={s.cropConfirmBtn}>
            저장
          </button>
        </div>
      </div>
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
  t,
}) {
  const programmeOptions = ['foundation', 'bachelor', 'master', 'alumni'];

  return (
    <div style={s.form}>
      <h1 style={s.formTitle}>{t.academicInfo}</h1>

      <div style={s.academicGrid}>
        <Field label={t.university}>
          <TypeaheadSelect
            name="university"
            value={formData.university}
            onChange={handleChange}
            options={SORTED_UNIVERSITIES}
            placeholder=""
          />
        </Field>
        <Field label={t.major}>
          <TypeaheadSelect
            name="major"
            value={formData.major}
            onChange={handleChange}
            options={SORTED_MAJORS}
            placeholder=""
          />
        </Field>
      </div>

      <Field label={t.studentNumber}>
        <input
          name="studentNumber"
          value={formData.studentNumber}
          onChange={handleChange}
          style={s.input}
        />
      </Field>

      <Field label={t.programme}>
        <div style={s.programmeGrid}>
          {programmeOptions.map((level) => (
            <label
              key={level}
              style={{
                ...s.programmeOption,
                ...(formData.educationLevel === level ? s.programmeOptionActive : {}),
              }}
            >
              <input
                type="radio"
                name="educationLevel"
                value={level}
                checked={formData.educationLevel === level}
                onChange={handleEducationLevelChange}
                style={s.programmeRadio}
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
            <option value=""></option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {t.year} {y}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div style={s.stepActions}>
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
          style={{
            ...s.submitBtn,
            flex: 1,
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
      <h1 style={s.formTitle}>{t.finalStep}</h1>

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

      <div style={s.stepActions}>
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
    backgroundColor: '#fff',
    padding: '0',
  },
  topBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: 'white',
    boxShadow: 'none',
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
    gap: '18px',
    marginTop: '0',
    padding: '18px 32px 32px',
    backgroundColor: 'white',
    borderRadius: '0',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto 20px',
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 4px',
    textAlign: 'left',
  },
  aboutTopGrid: {
    display: 'grid',
    gridTemplateColumns: '132px 1fr',
    gap: '22px',
    alignItems: 'center',
  },
  profilePicker: {
    display: 'flex',
    justifyContent: 'center',
  },
  avatarButton: {
    position: 'relative',
    width: '108px',
    height: '108px',
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  avatarCircle: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '8px',
    border: '1px solid rgba(44,42,39,0.08)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  avatarText: {
    marginTop: '-8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
  },
  cameraBadge: {
    position: 'absolute',
    top: '0',
    right: '4px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
  },
  nameGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 12px',
  },
  academicGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  input: {
    padding: '11px 12px',
    borderRadius: '8px',
    border: '1px solid #d7d2c8',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    color: '#111827',
  },
  select: {
    padding: '11px 12px',
    borderRadius: '8px',
    border: '1px solid #d7d2c8',
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
  programmeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
    gap: '10px',
    marginTop: '4px',
  },
  programmeOption: {
    position: 'relative',
    minHeight: '44px',
    borderRadius: '9999px',
    border: '1px solid #d7d2c8',
    backgroundColor: '#fff',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
  },
  programmeOptionActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
    color: '#fff',
  },
  programmeRadio: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
  stepActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
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
  cropOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  cropModal: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  cropTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: '#111827',
  },
  cropFrame: {
    position: 'relative',
    width: '100%',
    height: '280px',
    borderRadius: '14px',
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  zoomSlider: {
    width: '100%',
  },
  cropActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cropCancelBtn: {
    padding: '8px 14px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cropConfirmBtn: {
    padding: '8px 16px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
