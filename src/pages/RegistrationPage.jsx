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

// Sorted versions for typeahead
const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) => a.localeCompare(b));
const SORTED_GENDERS = [...GENDERS].sort((a, b) => a.localeCompare(b));
const SORTED_UNIVERSITIES = [...UNIVERSITY_OPTIONS].sort((a, b) => a.localeCompare(b));
const SORTED_MAJORS = [...MAJOR_OPTIONS].sort((a, b) => a.localeCompare(b));

// ── Typeahead select component ────────────────────────────────────────────────
function TypeaheadSelect({ name, value, onChange, options, placeholder = '' }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
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

  // Final step: after successful registration, tell user to check email
  if (step === 'email') {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
            <h1 style={s.title}>Check your email</h1>
            <p
              style={{
                fontSize: '13px',
                color: '#6b7280',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              We sent a confirmation link to <br />
              <strong style={{ color: '#111827' }}>{formData.email}</strong>
              <br />
              Please open that email, verify your address, then come back and log in.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/login')} style={s.submitBtn}>
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.title}>Account Register</h1>
          <p style={s.subtitle}>
            Your membership will be <strong>inactive</strong> after registration. The board will activate it once verified.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {error && <div style={s.errorBanner}>{error}</div>}

        {step === 'about' && (
          <AboutStep formData={formData} handleChange={handleChange} goNext={goNext} />
        )}

        {step === 'academic' && (
          <AcademicStep
            formData={formData}
            handleChange={handleChange}
            handleEducationLevelChange={handleEducationLevelChange}
            yearOptions={yearOptions}
            goNext={goNext}
            goBack={goBack}
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
          />
        )}

        <p style={s.note}>* Required fields</p>
      </div>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
  const steps = [
    { key: 'about', label: 'About you', number: 1 },
    { key: 'academic', label: 'Studies', number: 2 },
    { key: 'account', label: 'Account', number: 3 },
  ];

  const activeIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div style={s.stepRow}>
      {steps.map((step, i) => {
        const active = i === activeIndex;
        const completed = i < activeIndex;
        const bg = completed ? '#22c55e' : active ? '#f97316' : '#e5e7eb';
        const color = completed || active ? '#ffffff' : '#6b7280';

        return (
          <div key={step.key} style={s.stepItem}>
            <div
              style={{
                ...s.stepCircle,
                backgroundColor: bg,
                color,
              }}
            >
              {step.number}
            </div>
            <span
              style={{
                fontSize: '11px',
                color: active ? '#f97316' : '#6b7280',
                fontWeight: active ? 600 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: About you ──────────────────────────────────────────────────────────
function AboutStep({ formData, handleChange, goNext }) {
  // Check if all required fields are filled
  const isComplete =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.firstNameKorean.trim() &&
    formData.lastNameKorean.trim() &&
    formData.gender &&
    formData.countryOfOrigin;

  return (
    <div style={s.form}>
      <SectionTitle>About you</SectionTitle>

      <Row>
        <Field label="First name (English) *">
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
        <Field label="Last name (English) *">
          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
      </Row>

      <Row>
        <Field label="First name (Korean) *">
          <input
            name="firstNameKorean"
            value={formData.firstNameKorean}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
        <Field label="Last name (Korean) *">
          <input
            name="lastNameKorean"
            value={formData.lastNameKorean}
            onChange={handleChange}
            style={s.input}
          />
        </Field>
      </Row>

      <p style={s.helperText}>
        💡 If you don't have a Korean name, you may fill both fields in English.
      </p>

      <Row>
        <Field label="Year of birth (optional)">
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
        <Field label="Gender *">
          <TypeaheadSelect
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            options={SORTED_GENDERS}
            placeholder="Select gender"
          />
        </Field>
      </Row>

      <Field label="Nationality *">
        <TypeaheadSelect
          name="countryOfOrigin"
          value={formData.countryOfOrigin}
          onChange={handleChange}
          options={SORTED_COUNTRIES}
          placeholder="Select nationality"
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
        Next →
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
}) {
  // Check if all required fields are filled
  const isComplete =
    formData.university &&
    formData.major &&
    formData.educationLevel &&
    (yearOptions.length === 0 || formData.yearNumber);

  return (
    <div style={s.form}>
      <SectionTitle>Academic information</SectionTitle>

      <Row>
        <Field label="University *">
          <TypeaheadSelect
            name="university"
            value={formData.university}
            onChange={handleChange}
            options={SORTED_UNIVERSITIES}
            placeholder="Select university"
          />
        </Field>
        <Field label="Major *">
          <TypeaheadSelect
            name="major"
            value={formData.major}
            onChange={handleChange}
            options={SORTED_MAJORS}
            placeholder="Select major"
          />
        </Field>
      </Row>

      <Field label="Programme *">
        <div style={s.radioGroup}>
          {['foundation', 'bachelor', 'master', 'alumni'].map((level) => (
            <label key={level} style={s.radioLabel}>
              <input
                type="radio"
                name="educationLevel"
                value={level}
                checked={formData.educationLevel === level}
                onChange={handleEducationLevelChange}
              />
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </label>
          ))}
        </div>
      </Field>

      {yearOptions.length > 0 && (
        <Field label="Academic year *">
          <select
            name="yearNumber"
            value={formData.yearNumber}
            onChange={handleChange}
            style={s.select}
          >
            <option value="">Select year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                Year {y}
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
          ← Back
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
          Next →
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
}) {
  // Check if all required fields are filled
  const isComplete =
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword &&
    formData.password.length >= 6;

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      <SectionTitle>Final step</SectionTitle>

      <Field label="Email *">
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
        <Field label="Password *">
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            style={s.input}
            placeholder="Min. 6 characters"
          />
        </Field>
        <Field label="Confirm password *">
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
          ⚠️ Passwords do not match
        </p>
      )}

      <Field label="Profile picture (optional)">
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
          ← Back
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      <p style={s.loginPrompt}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={s.linkBtn}
        >
          Log in
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '32px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)',
    padding: '32px',
    maxWidth: '640px',
    width: '100%',
  },
  header: {
    marginBottom: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '10px',
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
  },
  errorBanner: {
    padding: '10px 12px',
    marginBottom: '4px',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    fontSize: '13px',
  },
  successBanner: {
    padding: '10px 12px',
    marginBottom: '4px',
    borderRadius: '6px',
    backgroundColor: '#ecfdf5',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    fontSize: '13px',
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
  // typeahead styles
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
  // step indicator
  stepRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    gap: '8px',
  },
  stepItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
  },
};