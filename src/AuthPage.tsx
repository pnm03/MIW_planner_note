import React, { useState } from "react";
import { supabase } from "./supabaseClient";

interface AuthPageProps {
  onBack: () => void;
  initialMode?: "login" | "signup" | "forgot";
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onBack,
  initialMode = "login",
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        setMessage("Đăng nhập thành công!");
        onAuthSuccess();
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Mật khẩu xác nhận không khớp!");
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác thực tài khoản."
        );
      } else if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );
        if (resetError) throw resetError;
        setMessage("Yêu cầu khôi phục mật khẩu đã được gửi đến email của bạn.");
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="auth-back-btn" onClick={onBack} title="Quay lại">
          ← Quay lại miw planner
        </button>

        <h2 className="auth-title">
          {mode === "login" && "Chào mừng trở lại"}
          {mode === "signup" && "Tạo tài khoản mới"}
          {mode === "forgot" && "Khôi phục mật khẩu"}
        </h2>
        <p className="auth-subtitle">
          {mode === "login" && "Đăng nhập để đồng bộ lịch trình của bạn lên đám mây"}
          {mode === "signup" && "Lưu trữ và truy cập dữ liệu planner từ bất kỳ đâu"}
          {mode === "forgot" && "Nhập email để nhận đường dẫn đặt lại mật khẩu"}
        </p>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@viethuong.com"
              disabled={loading}
            />
          </div>

          {mode !== "forgot" && (
            <div className="auth-field">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          )}

          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <input
                type="password"
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Đang xử lý..." : ""}
            {!loading && mode === "login" && "Đăng nhập"}
            {!loading && mode === "signup" && "Đăng ký"}
            {!loading && mode === "forgot" && "Gửi yêu cầu"}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" && (
            <>
              <button
                className="auth-link-btn"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
              <button
                className="auth-link-btn"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setMessage(null);
                }}
              >
                Quên mật khẩu?
              </button>
            </>
          )}

          {mode === "signup" && (
            <button
              className="auth-link-btn"
              onClick={() => {
                setMode("login");
                setError(null);
                setMessage(null);
              }}
            >
              Đã có tài khoản? Đăng nhập
            </button>
          )}

          {mode === "forgot" && (
            <button
              className="auth-link-btn"
              onClick={() => {
                setMode("login");
                setError(null);
                setMessage(null);
              }}
            >
              Quay lại đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
