// src/pages/RegistrationPage.jsx
// Presentation only — all logic lives in useRegisterMember hook.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CaretLeft, EnvelopeSimple, UserCircle } from '@phosphor-icons/react'
import Cropper from 'react-easy-crop'

import { useRegisterMember } from '../hooks/useRegisterMember'
import { getYearOptions } from '../domain/member/memberRegistration'

const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Czechia',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

const GENDERS = ['female', 'male', 'non-binary', 'prefer not to say']
const GENDERS_KO = ['여성', '남성', '논바이너리', '응답 거절']

const CUSTOM_TYPE_OPTION = 'Others (type)'

const UNIVERSITY_OPTIONS = ['University of Amsterdam (UvA)']

const MAJOR_OPTIONS = [
  'Business Administration',
  'Business Analytics',
  'Communication Science',
  'Econometrics and Data Science',
  'Economics and Business Economics',
  'Global Arts, Culture and Politics',
  'Media and Information',
  'Sport and Performance Psychology',
]

const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.localeCompare(b))
const SORTED_GENDERS = [...GENDERS].sort((a, b) => a.localeCompare(b))
const SORTED_GENDERS_KO = [...GENDERS_KO].sort((a, b) => a.localeCompare(b, 'ko'))
const SORTED_UNIVERSITIES = [...UNIVERSITY_OPTIONS]
  .sort((a, b) => a.localeCompare(b))
  .concat(CUSTOM_TYPE_OPTION)
const SORTED_MAJORS = [...MAJOR_OPTIONS]
  .sort((a, b) => a.localeCompare(b))
  .concat(CUSTOM_TYPE_OPTION)

const PASTEL_COLORS = [
  '#FFB3B3',
  '#FFD9A0',
  '#FFF3A0',
  '#B3F0C2',
  '#A8D8FF',
  '#C5B3FF',
  '#FFB3E6',
  '#B3F0EE',
]

function getPastelColor(seed) {
  const str = seed || 'default'
  let hash = 0

  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }

  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}

async function getCroppedImgAsFile(imageSrc, pixelCrop, fileName = 'profile.jpg') {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

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
    )

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(result)
      },
      'image/jpeg',
      0.95
    )
  })

  return new File([blob], fileName, { type: 'image/jpeg' })
}

const translations = {
  en: {
    title: 'Sign up',
    subtitle:
      'Your membership will be inactive after registration.\nThe board will activate it once verified.',
    aboutYou: 'About you',
    personalInfo: 'Personal information',
    academicInfo: 'Academic information',
    finalStep: 'And That',
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
    next: 'Next',
    back: 'Back',
    createAccount: 'Create account',
    creatingAccount: 'Creating account...',
    requiredFields: '* Required fields',
    passwordMismatch: 'Passwords do not match',
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
    greeting: 'Greetings,',
    upload: 'Upload',
    cropTitle: 'Crop profile photo',
    cancel: 'Cancel',
    save: 'Save',
  },
  ko: {
    title: 'Sign up',
    subtitle: '등록 후 회원 자격은 비활성 상태입니다.\n임원 확인 후 활성화됩니다.',
    aboutYou: '당신에 대해',
    personalInfo: '개인 정보',
    academicInfo: '학력 정보',
    finalStep: '마지막 단계',
    firstName: '이름 (영문) *',
    lastName: '성 (영문) *',
    firstNameKorean: '이름 (한글) *',
    lastNameKorean: '성 (한글) *',
    yearOfBirth: '출생 연도 (선택사항)',
    gender: '성별 *',
    nationality: '국적 *',
    university: '대학교 *',
    major: '전공 *',
    studentNumber: '학번 *',
    programme: '프로그램 *',
    academicYear: '학년 *',
    email: '이메일 *',
    password: '비밀번호 *',
    confirmPassword: '비밀번호 확인 *',
    profilePicture: '프로필 사진 (선택사항)',
    next: '다음',
    back: '뒤로',
    createAccount: '계정 만들기',
    creatingAccount: '계정 생성 중...',
    requiredFields: '* 필수 항목',
    passwordMismatch: '비밀번호가 일치하지 않습니다',
    checkEmail: '이메일 확인',
    emailSent: '확인 링크를 다음 주소로 보냈습니다',
    verifyEmail: '해당 이메일을 열고 주소를 확인한 뒤 다시 로그인하세요.',
    goToLogin: '로그인으로 이동',
    alreadyHaveAccount: '이미 계정이 있으신가요?',
    logIn: '로그인',
    minCharacters: '최소 6자',
    selectGender: '성별 선택',
    selectNationality: '국적 선택',
    selectUniversity: '대학교 선택',
    selectMajor: '전공 선택',
    selectYear: '학년 선택',
    year: '학년',
    foundation: 'Foundation',
    bachelor: 'Bachelor',
    master: 'Masters',
    alumni: 'Alumni',
    greeting: '안녕하세요,',
    upload: '업로드',
    cropTitle: '프로필 사진 자르기',
    cancel: '취소',
    save: '저장',
  },
}

function TypeaheadSelect({
  name,
  value,
  onChange,
  options,
  placeholder = '',
  allowCustom = false,
}) {
  const [inputValue, setInputValue] = useState(value || '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (val) => {
    if (allowCustom && val === CUSTOM_TYPE_OPTION) {
      setInputValue('')
      setOpen(false)
      onChange({ target: { name, value: '' } })
      return
    }

    setInputValue(val)
    setOpen(false)
    onChange({ target: { name, value: val } })
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    setOpen(true)

    if (allowCustom || val === '') {
      onChange({ target: { name, value: val } })
    }
  }

  return (
    <div ref={containerRef} style={s.typeaheadWrap}>
      <input
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{ ...s.input, ...s.typeaheadInputSpacer }}
        autoComplete="off"
      />

      <span style={s.dropdownIcon}>⌄</span>

      {open && filtered.length > 0 && (
        <div style={s.typeaheadList}>
          {filtered.map((opt) => (
            <div
              key={opt}
              style={s.typeaheadItem}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(opt)
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RegistrationPage() {
  const navigate = useNavigate()
  const [language, setLanguage] = useState('ko')
  const fileInputRef = useRef(null)

  const [profilePreviewUrl, setProfilePreviewUrl] = useState('')
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [cropFileName, setCropFileName] = useState('profile.jpg')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

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
  } = useRegisterMember()

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  useEffect(() => {
    return () => {
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl)
    }
  }, [profilePreviewUrl])

  const yearOptions = getYearOptions(formData.educationLevel)
  const t = translations[language]

  const displayName =
    `${formData.lastNameKorean || ''}${formData.firstNameKorean || ''}`.trim() ||
    `${formData.firstName || ''} ${formData.lastName || ''}`.trim()

  const greetingName =
    language === 'ko'
      ? formData.firstNameKorean || formData.firstName || '회원'
      : formData.firstName || 'member'

  const pastelBg = getPastelColor(displayName || 'registration-default-profile')

  const handleProfileFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      setCropImageSrc(reader.result)
      setCropFileName(file.name || 'profile.jpg')
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    }

    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return

    const croppedFile = await getCroppedImgAsFile(
      cropImageSrc,
      croppedAreaPixels,
      cropFileName
    )

    setProfileFile(croppedFile)

    setProfilePreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(croppedFile)
    })

    setCropImageSrc(null)
    setCroppedAreaPixels(null)
  }

  const closeCropper = () => {
    setCropImageSrc(null)
    setCroppedAreaPixels(null)
  }

  const handleTopBack = () => {
    if (step === 'about') {
      navigate('/public')
      return
    }

    goBack()
  }

  const profileHeroProps = {
    fileInputRef,
    profilePreviewUrl,
    pastelBg,
    onProfileClick: () => fileInputRef.current?.click(),
    t,
  }

  if (step === 'email') {
    return (
      <div style={s.page}>
        <style>{registrationMotionCss}</style>

        <div style={s.topBar}>
          <button
            type="button"
            onClick={() => navigate('/public')}
            style={s.backButton}
            title="Go back"
          >
            <CaretLeft size={24} weight="bold" />
          </button>

          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            style={s.languageToggle}
          >
            {language === 'en' ? '한국어' : 'English'}
          </button>
        </div>

        <div style={s.emailCard}>
          <div style={s.emailIcon}>
            <EnvelopeSimple size={30} weight="bold" color="#f97316" />
          </div>

          <h1 style={s.emailTitle}>{t.checkEmail}</h1>

          <p style={s.emailText}>
            {t.emailSent}
            <br />
            <strong style={s.emailStrong}>{formData.email}</strong>
            <br />
            {t.verifyEmail}
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            style={s.submitBtn}
          >
            {t.goToLogin}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <style>{registrationMotionCss}</style>

      <div style={s.topBar}>
        <button
          type="button"
          onClick={handleTopBack}
          style={s.backButton}
          title="Go back"
        >
          <CaretLeft size={24} weight="bold" />
        </button>

        {step === 'about' && (
          <div className="registration-title" style={s.topTitle}>
            {t.title}
          </div>
        )}

        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          style={s.languageToggle}
        >
          {language === 'en' ? '한국어' : 'English'}
        </button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProfileFileChange}
        style={{ display: 'none' }}
      />

      {step === 'about' && (
        <NameStep
          formData={formData}
          handleChange={handleChange}
          goNext={goNext}
          language={language}
          t={t}
          profileHeroProps={profileHeroProps}
        />
      )}

      {step === 'personal' && (
        <PersonalStep
          formData={formData}
          handleChange={handleChange}
          goNext={goNext}
          language={language}
          t={t}
          greetingName={greetingName}
          profileHeroProps={profileHeroProps}
        />
      )}

      {step === 'academic' && (
        <AcademicStep
          formData={formData}
          handleChange={handleChange}
          handleEducationLevelChange={handleEducationLevelChange}
          yearOptions={yearOptions}
          goNext={goNext}
          t={t}
          greetingName={greetingName}
          language={language}
          profileHeroProps={profileHeroProps}
        />
      )}

      {step === 'account' && (
        <AccountStep
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          loading={loading}
          t={t}
          language={language}
          profileHeroProps={profileHeroProps}
        />
      )}

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
          t={t}
        />
      )}
    </div>
  )
}

function ProfileHero({
  profileHeroProps,
  variant = 'large',
  firstLine,
  secondLine,
  allowUpload = true,
  equalIntroTextSize = false,
}) {
  const { profilePreviewUrl, pastelBg, onProfileClick, t } = profileHeroProps
  const compact = variant === 'compact'
  const academic = variant === 'academic'
  const showIntro = Boolean(firstLine || secondLine)

  const avatarSize = compact ? 66 : academic ? 76 : 98

  return (
    <div style={s.hero}>
      <button
        type="button"
        onClick={allowUpload ? onProfileClick : undefined}
        style={{
          ...s.avatarButton,
          width: avatarSize,
          height: avatarSize,
          backgroundColor: profilePreviewUrl ? 'transparent' : pastelBg,
          cursor: allowUpload ? 'pointer' : 'default',
        }}
        data-motion="avatar"
      >
        {profilePreviewUrl ? (
          <img src={profilePreviewUrl} alt="Profile preview" style={s.avatarImage} />
        ) : (
          <UserCircle size={compact ? 46 : 64} weight="fill" color="rgba(0,0,0,0.22)" />
        )}

        {allowUpload && (
          <span style={s.cameraBadge}>
            <Camera size={14} weight="bold" />
          </span>
        )}
      </button>

      {allowUpload && (
        <button type="button" onClick={onProfileClick} style={s.uploadTextButton}>
          {t.upload}
        </button>
      )}

      {showIntro && (
        <div data-motion="hero-text" style={s.heroTextWrap}>
          {firstLine && (
            <div
              style={{
                ...s.heroFirstLine,
                ...(equalIntroTextSize ? s.heroEqualLine : {}),
              }}
            >
              {firstLine}
            </div>
          )}

          {secondLine && (
            <div
              style={{
                ...s.heroSecondLine,
                ...(equalIntroTextSize ? s.heroEqualLine : {}),
              }}
            >
              {secondLine}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NameStep({ formData, handleChange, goNext, language, t, profileHeroProps }) {
  return (
    <form style={s.form} onSubmit={(e) => e.preventDefault()}>
      <div style={s.stepBody} className="registration-step">
        <ProfileHero
          profileHeroProps={profileHeroProps}
          firstLine={t.aboutYou}
          secondLine={t.subtitle}
          equalIntroTextSize={false}
        />

        <div data-motion="fields" style={s.fields}>
          <Row>
            <Field label={t.firstName}>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                style={s.input}
                autoComplete="given-name"
              />
            </Field>

            <Field label={t.lastName}>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                style={s.input}
                autoComplete="family-name"
              />
            </Field>
          </Row>

          {language === 'ko' && (
            <Row>
              <Field label={t.firstNameKorean}>
                <input
                  name="firstNameKorean"
                  value={formData.firstNameKorean}
                  onChange={handleChange}
                  style={s.input}
                />
              </Field>

              <Field label={t.lastNameKorean}>
                <input
                  name="lastNameKorean"
                  value={formData.lastNameKorean}
                  onChange={handleChange}
                  style={s.input}
                />
              </Field>
            </Row>
          )}
        </div>
      </div>

      <button type="button" onClick={goNext} style={s.submitBtn}>
        {t.next}
      </button>
    </form>
  )
}

function PersonalStep({
  formData,
  handleChange,
  goNext,
  language,
  t,
  greetingName,
  profileHeroProps,
}) {
  const greetingFirstLine = language === 'ko' ? t.greeting : 'Greetings,'
  const greetingSecondLine = language === 'ko' ? `${greetingName}님` : greetingName

  return (
    <form style={s.form} onSubmit={(e) => e.preventDefault()}>
      <div style={s.stepBody} className="registration-step registration-step-personal">
        <ProfileHero
          profileHeroProps={profileHeroProps}
          variant="compact"
          firstLine={greetingFirstLine}
          secondLine={greetingSecondLine}
          allowUpload={false}
          equalIntroTextSize
        />

        <div data-motion="fields" style={s.fields}>
          <Field label={t.yearOfBirth}>
            <input
              name="yearOfBirth"
              value={formData.yearOfBirth}
              onChange={handleChange}
              style={s.input}
              inputMode="numeric"
              placeholder="YYYY"
            />
          </Field>

          <Field label={t.gender}>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              style={s.select}
            >
              <option value="">{t.selectGender}</option>
              {(language === 'ko' ? SORTED_GENDERS_KO : SORTED_GENDERS).map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.nationality}>
            <TypeaheadSelect
              name="countryOfOrigin"
              value={formData.countryOfOrigin}
              onChange={handleChange}
              options={SORTED_COUNTRIES}
              placeholder={t.selectNationality}
            />
          </Field>
        </div>
      </div>

      <button type="button" onClick={goNext} style={s.submitBtn}>
        {t.next}
      </button>
    </form>
  )
}

function AcademicStep({
  formData,
  handleChange,
  handleEducationLevelChange,
  yearOptions,
  goNext,
  t,
  greetingName,
  language,
  profileHeroProps,
}) {
  const programmeOptions = ['foundation', 'bachelor', 'master', 'alumni']

  return (
    <form style={s.form} onSubmit={(e) => e.preventDefault()}>
      <div style={s.stepBody} className="registration-step registration-step-academic">
        <ProfileHero
          profileHeroProps={profileHeroProps}
          variant="academic"
          firstLine={language === 'ko' ? `${greetingName}님,` : greetingName}
          secondLine={t.academicInfo}
          allowUpload={false}
          equalIntroTextSize
        />

        <div data-motion="fields" style={s.fields}>
          <Field label={t.university}>
            <TypeaheadSelect
              name="university"
              value={formData.university}
              onChange={handleChange}
              options={SORTED_UNIVERSITIES}
              placeholder={t.selectUniversity}
              allowCustom
            />
          </Field>

          <Field label={t.major}>
            <TypeaheadSelect
              name="major"
              value={formData.major}
              onChange={handleChange}
              options={SORTED_MAJORS}
              placeholder={t.selectMajor}
              allowCustom
            />
          </Field>

          <Field label={t.studentNumber}>
            <input
              name="studentNumber"
              value={formData.studentNumber}
              onChange={handleChange}
              style={s.input}
              inputMode="numeric"
            />
          </Field>

          <Field label={t.programme} variant="group">
            <div style={s.programmeGrid}>
              {programmeOptions.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    handleEducationLevelChange({
                      target: { name: 'educationLevel', value: level },
                    })
                  }
                  style={{
                    ...s.programmeOption,
                    ...(formData.educationLevel === level ? s.programmeOptionActive : {}),
                  }}
                >
                  {t[level]}
                </button>
              ))}
            </div>
          </Field>

          {yearOptions.length > 0 && (
            <Field label={t.academicYear} variant="group">
              <div style={s.yearGrid}>
                {yearOptions.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() =>
                      handleChange({
                        target: { name: 'yearNumber', value: String(y) },
                      })
                    }
                    style={{
                      ...s.yearOption,
                      ...(String(formData.yearNumber) === String(y)
                        ? s.yearOptionActive
                        : {}),
                    }}
                  >
                    {t.year} {y}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>
      </div>

      <button type="button" onClick={goNext} style={s.submitBtn}>
        {t.next}
      </button>
    </form>
  )
}

function AccountStep({
  formData,
  handleChange,
  handleSubmit,
  loading,
  t,
  language,
  profileHeroProps,
}) {
  const isComplete =
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword &&
    formData.password.length >= 6

  return (
    <form style={s.form} onSubmit={handleSubmit}>
      <div style={s.stepBody} className="registration-step registration-step-account">
        <ProfileHero
          profileHeroProps={profileHeroProps}
          variant="compact"
          firstLine={language === 'ko' ? t.finalStep : t.finalStep}
          secondLine={t.requiredFields}
          allowUpload={false}
          equalIntroTextSize
        />

        <div data-motion="fields" style={s.fields}>
          <Field label={t.email}>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              style={s.input}
              autoComplete="email"
            />
          </Field>

          <Field label={t.password}>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              style={s.input}
              autoComplete="new-password"
            />
          </Field>

          <Field label={t.confirmPassword}>
            <input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={s.input}
              autoComplete="new-password"
            />
          </Field>

          <p style={s.helperText}>{t.minCharacters}</p>

          {formData.password &&
            formData.confirmPassword &&
            formData.password !== formData.confirmPassword && (
              <div style={s.inlineError}>{t.passwordMismatch}</div>
            )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isComplete}
        style={{
          ...s.submitBtn,
          ...(loading || !isComplete ? s.submitBtnDisabled : {}),
        }}
      >
        {loading ? t.creatingAccount : t.createAccount}
      </button>

      <p style={s.loginPrompt}>
        {t.alreadyHaveAccount}{' '}
        <button type="button" onClick={() => window.location.assign('/login')} style={s.linkBtn}>
          {t.logIn}
        </button>
      </p>
    </form>
  )
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
  t,
}) {
  return (
    <div style={s.cropOverlay}>
      <div style={s.cropModal}>
        <h2 style={s.cropTitle}>{t.cropTitle}</h2>

        <div style={s.cropArea}>
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
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={s.zoomSlider}
        />

        <div style={s.cropActions}>
          <button type="button" onClick={onCancel} style={s.cropCancelBtn}>
            {t.cancel}
          </button>

          <button type="button" onClick={onConfirm} style={s.cropConfirmBtn}>
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ children }) {
  return <div style={s.row}>{children}</div>
}

function Field({ label, children, variant = 'input', style }) {
  const fieldRef = useRef(null)

  const handleFieldClick = (event) => {
    if (variant !== 'input') return
    if (event.target.closest('input, textarea, select, button')) return

    const input = fieldRef.current?.querySelector('input, textarea, select')
    input?.focus()
  }

  return (
    <div
      ref={fieldRef}
      onClick={handleFieldClick}
      style={{
        ...(variant === 'group' ? groupFieldStyle : fieldStyle),
        ...style,
      }}
    >
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

const registrationMotionCss = `
  :root {
    --reg-page-bg: #ffffff;
    --reg-card-bg: #ffffff;
    --reg-field-bg: #ffffff;
    --reg-text: #111827;
    --reg-subtext: #6b7280;
    --reg-muted: #9ca3af;
    --reg-border: #d8dde5;
    --reg-soft-border: #e5e7eb;
    --reg-button-dark: #111827;
    --reg-button-dark-text: #ffffff;
    --reg-ghost-bg: #f3f4f6;
    --reg-error-bg: #fef2f2;
    --reg-error-text: #b91c1c;
    --reg-error-border: #fecaca;
    --reg-email-icon-bg: #fff7ed;
    --reg-email-icon-border: #fed7aa;
    --reg-dropdown-shadow: 0 4px 10px rgba(0,0,0,0.08);
    --reg-avatar-border: rgba(44,42,39,0.08);
    --reg-camera-bg: #ffffff;
  }

  html.dark {
    --reg-page-bg: #121212;
    --reg-card-bg: #121212;
    --reg-field-bg: #121212;
    --reg-text: #f5f5f7;
    --reg-subtext: #c7c7cc;
    --reg-muted: #8e8e93;
    --reg-border: #2c2c2e;
    --reg-soft-border: #2c2c2e;
    --reg-button-dark: #f5f5f7;
    --reg-button-dark-text: #111111;
    --reg-ghost-bg: #1c1c1e;
    --reg-error-bg: #3b1d1d;
    --reg-error-text: #fca5a5;
    --reg-error-border: #7f1d1d;
    --reg-email-icon-bg: #2b1a10;
    --reg-email-icon-border: #7c3f12;
    --reg-dropdown-shadow: 0 8px 20px rgba(0,0,0,0.42);
    --reg-avatar-border: rgba(255,255,255,0.14);
    --reg-camera-bg: #1c1c1e;
  }

  @keyframes registrationFadeUp {
    from { opacity: 0.84; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes registrationTitleFade {
    from { opacity: 0.72; transform: translateX(-4px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes registrationHeroShrink {
    from { opacity: 0.98; transform: translate(20px, 10px) scale(1.22); }
    to { opacity: 1; transform: translate(0, 0) scale(1); }
  }

  @keyframes registrationHeroReturn {
    from { opacity: 0.98; transform: translate(-14px, -8px) scale(0.82); }
    to { opacity: 1; transform: translate(0, 0) scale(1); }
  }

  .registration-title {
    animation: registrationTitleFade 420ms ease-out both;
  }

  .registration-step [data-motion='hero-text'] {
    will-change: transform, opacity;
    animation: registrationFadeUp 820ms cubic-bezier(.16,.72,.18,1) both;
  }

  .registration-step [data-motion='fields'] {
    will-change: transform, opacity;
    animation: registrationFadeUp 1120ms cubic-bezier(.16,.72,.18,1) both;
  }

  .registration-step-academic [data-motion='avatar'] {
    transform-origin: left top;
    will-change: transform, opacity;
    animation: registrationHeroShrink 880ms cubic-bezier(.16,.72,.18,1) both;
  }

  .registration-step-account [data-motion='avatar'] {
    transform-origin: left top;
    will-change: transform, opacity;
    animation: registrationHeroReturn 880ms cubic-bezier(.16,.72,.18,1) both;
  }

  input::placeholder {
    color: var(--reg-muted);
  }

  select option {
    color: #111827;
    background: #ffffff;
  }

  html.dark select option {
    color: #f5f5f7;
    background: #1c1c1e;
  }
`

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  minHeight: '54px',
  padding: '8px 12px 7px',
  border: '1px solid var(--reg-border)',
  borderRadius: '8px',
  backgroundColor: 'var(--reg-field-bg)',
  boxSizing: 'border-box',
  justifyContent: 'center',
}

const groupFieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '7px',
  minHeight: '54px',
  padding: '8px 12px',
  border: '1px solid var(--reg-border)',
  borderRadius: '8px',
  backgroundColor: 'var(--reg-field-bg)',
  boxSizing: 'border-box',
  justifyContent: 'center',
}

const labelStyle = {
  fontSize: '12px',
  fontWeight: 400,
  color: 'var(--reg-subtext)',
  lineHeight: 1,
}

const s = {
  page: {
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'var(--reg-page-bg)',
    color: 'var(--reg-text)',
    padding: '0',
    overflow: 'hidden',
  },

  topBar: {
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    backgroundColor: 'var(--reg-page-bg)',
    boxShadow: 'none',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    minHeight: '42px',
  },

  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'var(--reg-subtext)',
    padding: '8px 8px 8px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
    transform: 'translateX(-22px)',
    width: '34px',
  },

  topTitle: {
    position: 'absolute',
    left: '4px',
    top: '12px',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--reg-text)',
    pointerEvents: 'none',
  },

  languageToggle: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--reg-soft-border)',
    backgroundColor: 'var(--reg-card-bg)',
    color: 'var(--reg-subtext)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    transform: 'translate(14px, 3px)',
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    marginTop: '0',
    padding: '6px 0 14px',
    backgroundColor: 'var(--reg-page-bg)',
    borderRadius: '0',
    maxWidth: '320px',
    width: '100%',
    margin: '0 auto',
    flex: 1,
    minHeight: 0,
    justifyContent: 'space-between',
  },

  stepBody: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },

  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '6px 0 18px',
  },

  avatarButton: {
    position: 'relative',
    borderRadius: '50%',
    border: '1px solid var(--reg-avatar-border)',
    padding: 0,
    overflow: 'visible',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
    display: 'block',
  },

  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--reg-camera-bg)',
    color: 'var(--reg-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--reg-soft-border)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  },

  uploadTextButton: {
    marginTop: '8px',
    border: 'none',
    background: 'none',
    color: 'var(--reg-subtext)',
    fontSize: '12px',
    cursor: 'pointer',
  },

  heroTextWrap: {
    marginTop: '12px',
    textAlign: 'center',
    maxWidth: '300px',
  },

  heroFirstLine: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--reg-text)',
    whiteSpace: 'pre-line',
  },

  heroSecondLine: {
    marginTop: '5px',
    fontSize: '12px',
    lineHeight: 1.45,
    color: 'var(--reg-subtext)',
    whiteSpace: 'pre-line',
  },

  heroEqualLine: {
    fontSize: '16px',
    fontWeight: 650,
    color: 'var(--reg-text)',
  },

  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '9px',
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },

  input: {
    padding: '0',
    borderRadius: '0',
    border: 'none',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'var(--reg-field-bg)',
    color: 'var(--reg-text)',
    minHeight: '20px',
  },

  select: {
    padding: '0',
    borderRadius: '0',
    border: 'none',
    fontSize: '14px',
    backgroundColor: 'var(--reg-field-bg)',
    color: 'var(--reg-text)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '20px',
  },

  typeaheadWrap: {
    position: 'relative',
    width: '100%',
  },

  typeaheadInputSpacer: {
    paddingRight: '22px',
  },

  dropdownIcon: {
    position: 'absolute',
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--reg-muted)',
    fontSize: '16px',
    lineHeight: 1,
    pointerEvents: 'none',
  },

  typeaheadList: {
    position: 'absolute',
    top: '100%',
    left: '-14px',
    right: '-14px',
    maxHeight: '180px',
    overflowY: 'auto',
    backgroundColor: 'var(--reg-card-bg)',
    borderRadius: '6px',
    boxShadow: 'var(--reg-dropdown-shadow)',
    marginTop: '4px',
    zIndex: 20,
    border: '1px solid var(--reg-soft-border)',
  },

  typeaheadItem: {
    padding: '8px 10px',
    fontSize: '14px',
    cursor: 'pointer',
    color: 'var(--reg-text)',
  },

  programmeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px',
  },

  programmeOption: {
    position: 'relative',
    minHeight: '30px',
    borderRadius: '9999px',
    border: '1px solid var(--reg-border)',
    backgroundColor: 'var(--reg-field-bg)',
    color: 'var(--reg-subtext)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
  },

  programmeOptionActive: {
    backgroundColor: 'var(--reg-button-dark)',
    borderColor: 'var(--reg-button-dark)',
    color: 'var(--reg-button-dark-text)',
  },

  yearGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px',
  },

  yearOption: {
    minHeight: '30px',
    borderRadius: '9999px',
    border: '1px solid var(--reg-border)',
    backgroundColor: 'var(--reg-field-bg)',
    color: 'var(--reg-subtext)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  yearOptionActive: {
    backgroundColor: 'var(--reg-button-dark)',
    borderColor: 'var(--reg-button-dark)',
    color: 'var(--reg-button-dark-text)',
  },

  submitBtn: {
    width: '100%',
    minHeight: '44px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: 'var(--reg-button-dark)',
    color: 'var(--reg-button-dark-text)',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '12px',
  },

  submitBtnDisabled: {
    opacity: 0.42,
    cursor: 'not-allowed',
  },

  errorBanner: {
    padding: '10px 12px',
    margin: '8px auto',
    borderRadius: '6px',
    backgroundColor: 'var(--reg-error-bg)',
    color: 'var(--reg-error-text)',
    border: '1px solid var(--reg-error-border)',
    fontSize: '13px',
    maxWidth: '320px',
    width: '100%',
    boxSizing: 'border-box',
  },

  inlineError: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--reg-error-bg)',
    color: 'var(--reg-error-text)',
    border: '1px solid var(--reg-error-border)',
    fontSize: '12px',
  },

  loginPrompt: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--reg-subtext)',
    margin: '8px 0 0',
  },

  linkBtn: {
    border: 'none',
    background: 'none',
    padding: 0,
    color: 'var(--reg-text)',
    fontWeight: 700,
    cursor: 'pointer',
  },

  helperText: {
    fontSize: '12px',
    color: 'var(--reg-subtext)',
    margin: '2px 0 0',
    fontStyle: 'italic',
  },

  emailCard: {
    backgroundColor: 'var(--reg-page-bg)',
    borderRadius: '0',
    boxShadow: 'none',
    padding: '0 0 14px',
    maxWidth: '320px',
    width: '100%',
    margin: '122px auto 0',
    textAlign: 'center',
  },

  emailIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    margin: '0 auto 18px',
    backgroundColor: 'var(--reg-email-icon-bg)',
    border: '1px solid var(--reg-email-icon-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emailTitle: {
    fontSize: '21px',
    fontWeight: 700,
    color: 'var(--reg-text)',
    margin: '0 0 10px',
  },

  emailText: {
    fontSize: '14px',
    color: 'var(--reg-subtext)',
    lineHeight: 1.6,
    margin: '0 0 22px',
  },

  emailStrong: {
    color: 'var(--reg-text)',
  },

  cropOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.58)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px',
  },

  cropModal: {
    width: '100%',
    maxWidth: '380px',
    backgroundColor: 'var(--reg-card-bg)',
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
    color: 'var(--reg-text)',
  },

  cropArea: {
    position: 'relative',
    width: '100%',
    height: '280px',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#111',
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
    backgroundColor: 'var(--reg-ghost-bg)',
    color: 'var(--reg-subtext)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  cropConfirmBtn: {
    padding: '8px 16px',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: 'var(--reg-button-dark)',
    color: 'var(--reg-button-dark-text)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}