// src/pages/RegistrationPage.jsx
//
// Presentation only — all logic lives in useRegisterMember hook.
// ❌ Do NOT copy to React Native — rewrite UI with RN components.

import { useNavigate } from 'react-router-dom';
import { useRegisterMember } from '../hooks/useRegisterMember';
import { getYearOptions } from '../domain/member/memberRegistration';

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
const SORTED_COUNTRIES = [...COUNTRIES].sort((a, b) =>
  a.localeCompare(b)
);
const SORTED_GENDERS = [...GENDERS].sort((a, b) => a.localeCompare(b));
const SORTED_UNIVERSITIES = [...UNIVERSITY_OPTIONS].sort((a, b) =>
  a.localeCompare(b)
);
const SORTED_MAJORS = [...MAJOR_OPTIONS].sort((a, b) =>
  a.localeCompare(b)
);

// ── Typeahead select component ──────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';

function TypeaheadSelect({
  name,
  value,
  onChange,
  options,
  placeholder = '',
}) {
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
    // send synthetic event to useRegisterMember.handleChange
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
                e.preventDefault(); // prevent input blur before click
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

export default function RegistrationPage() {
  const navigate = useNavigate();
  const {
    step,
    formData,
    otp,
    setOtp,
    loading,
    error,
    resendSuccess,
    handleChange,
    handleEducationLevelChange,
    handleSubmit,
    handleConfirmOtp,
    handleResendOtp,
    handleBack,
  } = useRegisterMember();

  const yearOptions = getYearOptions(formData.educationLevel);

  // ── STEP 2: OTP confirmation screen ───────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, maxWidth: '400px' }}>
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
              We sent a 6-digit code to
              <br />
              <strong style={{ color: '#111827' }}>{formData.email}</strong>
            </p>
          </div>

          {error && <div style={s.errorBanner}>{error}</div>}
          {resendSuccess && (
            <div style={s.successBanner}>New code sent ✓</div>
          )}

          <form
            onSubmit={handleConfirmOtp}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <label style={labelStyle}>Confirmation code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, ''))
                }
                style={{
                  ...s.input,
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '0.3em',
                  fontFamily: 'monospace',
                }}
                placeholder="000000"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...s.submitBtn,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Verifying…' : 'Confirm account'}
            </button>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              <button
                type="button"
                onClick={handleBack}
                style={s.ghostBtn}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                style={{
                  ...s.ghostBtn,
                  color: '#f97316',
                }}
              >
                Resend code
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── STEP 1: Registration form ──────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.title}>Create your SPOT account</h1>
          <p style={s.subtitle}>
            Your membership will be <strong>inactive</strong> after
            registration. The board will activate it once verified.
          </p>
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* ── Personal info ── */}
          <SectionTitle>Personal information</SectionTitle>
          <Row>
            <Field label="First name *">
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                style={s.input}
              />
            </Field>
            <Field label="Last name *">
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                style={s.input}
              />
            </Field>
          </Row>

          <Row>
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
            <Field label="Student number *">
              <input
                name="studentNumber"
                value={formData.studentNumber}
                onChange={handleChange}
                style={s.input}
                placeholder="e.g. 12345678"
              />
            </Field>
          </Row>

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

          <Field label="Country of origin *">
            <TypeaheadSelect
              name="countryOfOrigin"
              value={formData.countryOfOrigin}
              onChange={handleChange}
              options={SORTED_COUNTRIES}
              placeholder="Select country"
            />
          </Field>

          {/* ── Academic info ── */}
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
              {['bachelor', 'master', 'alumni'].map((level) => (
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
            <Field label={`Year (${formData.educationLevel}) *`}>
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

          {/* ── Account credentials ── */}
          <SectionTitle>Login credentials</SectionTitle>
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

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...s.submitBtn,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

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

        <p style={s.note}>* Required fields</p>
      </div>
    </div>
  );
}

// ── Small layout helpers ─────────────────────────────────────────────────────

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

// ── Styles ───────────────────────────────────────────────────────────────────

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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
    marginBottom: '20px',
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
  disabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
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
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: '#9ca3af',
  },
  note: {
    marginTop: '16px',
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'center',
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
};