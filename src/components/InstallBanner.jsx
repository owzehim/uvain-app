// src/components/InstallBanner.jsx
import { useEffect, useState } from "react";
import { X, DeviceMobile, Export, PlusSquare } from '@phosphor-icons/react';

const STORAGE_KEY = "uvain_install_banner_dismissed";
const DISMISS_DAYS = 7;

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIOSChrome() {
  return /CriOS/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function wasDismissedRecently() {
  const ts = localStorage.getItem(STORAGE_KEY);
  if (!ts) return false;

  const diff = Date.now() - parseInt(ts, 10);
  return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const ios = isIOS();
  const iosChrome = isIOSChrome();

  useEffect(() => {
    if (isInStandaloneMode() || wasDismissedRecently()) return;

    if (!ios) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };

      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    } else {
      setShow(true);
    }
  }, [ios]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShow(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    }
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <style>{installBannerThemeCss}</style>

      <div style={styles.banner}>
        <button type="button" onClick={dismiss} style={styles.closeBtn} aria-label="Close">
          <X size={22} weight="bold" />
        </button>

        <div style={styles.iconWrapper}>
          <img src="/uvain logo.png" alt="uvain" style={styles.icon} />
        </div>

        <div style={styles.titleRow}>
          <DeviceMobile size={22} weight="fill" color="#f97316" />
          <h2 style={styles.title}>앱으로 더 편하게 사용하세요</h2>
        </div>

        <p style={styles.subtitle}>홈 화면에 추가하면 앱처럼 빠르게 실행할 수 있어요.</p>

        {ios ? (
          <div style={styles.iosGuide}>
            <div style={styles.iosGrid}>
              <span style={styles.stepNum}>1</span>
              <span style={styles.stepContent}>
                {iosChrome ? "상단" : "하단"}의{" "}
                <span style={styles.stepText}>
                  <Export size={17} weight="bold" color="#f97316" /> 공유 버튼
                </span>{" "}
                을 탭하세요
              </span>

              <span style={styles.stepNum}>2</span>
              <span style={styles.stepContent}>
                <span style={styles.stepText}>
                  <PlusSquare size={17} weight="bold" color="#f97316" /> 홈 화면에 추가
                </span>{" "}
                를 선택하세요
              </span>

              <span style={styles.stepNum}>3</span>
              <span style={styles.stepContent}>
                오른쪽 상단의{" "}
                <strong style={styles.strongText}>추가</strong>
                를 탭하세요
              </span>
            </div>
          </div>
        ) : (
          <button type="button" onClick={handleInstall} style={styles.installBtn}>
            <DeviceMobile size={18} weight="bold" /> 홈 화면에 추가하기
          </button>
        )}

        <button type="button" onClick={dismiss} style={styles.laterBtn}>
          나중에 할게요
        </button>
      </div>
    </div>
  );
}

const installBannerThemeCss = `
  :root {
    --install-bg: #ffffff;
    --install-text: #111111;
    --install-subtext: #555555;
    --install-step-content: #333333;
    --install-muted: #999999;
    --install-guide-bg: #f5f5f5;
    --install-step-bg: #000000;
    --install-step-text: #ffffff;
    --install-button-bg: #111111;
    --install-button-text: #ffffff;
    --install-shadow: 0 -4px 24px rgba(0,0,0,0.15);
  }

  html.dark {
    --install-bg: #121212;
    --install-text: #f5f5f7;
    --install-subtext: #c7c7cc;
    --install-step-content: #d1d1d6;
    --install-muted: #8e8e93;
    --install-guide-bg: #1c1c1e;
    --install-step-bg: #f5f5f7;
    --install-step-text: #111111;
    --install-button-bg: #f5f5f7;
    --install-button-text: #111111;
    --install-shadow: 0 -8px 28px rgba(0,0,0,0.45);
  }
`;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 9999,
    padding: "0 0 env(safe-area-inset-bottom)",
  },
  banner: {
    backgroundColor: "var(--install-bg)",
    borderRadius: "20px 20px 0 0",
    padding: "24px 20px 32px",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
    position: "relative",
    boxShadow: "var(--install-shadow)",
    color: "var(--install-text)",
  },
  closeBtn: {
    position: "absolute",
    top: "14px",
    right: "16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    color: "var(--install-muted)",
  },
  iconWrapper: {
    marginBottom: "12px",
  },
  icon: {
    width: "64px",
    height: "64px",
    borderRadius: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    marginBottom: "6px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    margin: 0,
    color: "var(--install-text)",
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--install-subtext)",
    margin: "0 0 20px",
    lineHeight: "1.5",
  },
  iosGuide: {
    backgroundColor: "var(--install-guide-bg)",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "center",
  },
  iosGrid: {
    display: "inline-grid",
    gridTemplateColumns: "22px 1fr",
    alignItems: "center",
    gap: "8px 10px",
  },
  stepNum: {
    backgroundColor: "var(--install-step-bg)",
    color: "var(--install-step-text)",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  stepContent: {
    fontSize: "14px",
    color: "var(--install-step-content)",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "4px",
    textAlign: "left",
  },
  stepText: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
  },
  strongText: {
    color: "var(--install-text)",
  },
  installBtn: {
    width: "100%",
    padding: "14px",
    backgroundColor: "var(--install-button-bg)",
    color: "var(--install-button-text)",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  laterBtn: {
    background: "none",
    border: "none",
    color: "var(--install-muted)",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px",
  },
};
