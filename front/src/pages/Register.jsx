import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import SwordAnimation from "../components/SwordAnimation";
import BearAnimation from "../components/BearAnimation";
import pathofheroImage from "../assets/pathofhero.png";

const Register = () => {
  console.log("Register component rendered");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/news", { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const success = await register(formData.username, formData.password);
    if (success) {
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center auth-page relative">
      <SwordAnimation />
      <BearAnimation />
      <div className="max-w-md w-full space-y-2" style={{ marginTop: "-28vh" }}>
        <div className="text-center">
          <img
            src={pathofheroImage}
            alt="Path of Hero"
            style={{
              width: "17vw",
              maxWidth: "400px",
              height: "auto",
              marginBottom: "-4rem",
            }}
            className="mx-auto object-contain"
          />
        </div>

        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="input-field mt-1"
                placeholder="사용자명을 입력하세요"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호 확인
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field pr-10"
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>회원가입</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
              <Link
                to="/login"
                className="text-blue-300 hover:text-blue-200 font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* <div className="text-center text-sm text-gray-300">
          <p>💰 1천만원의 초기 자금으로 시작</p>
          <p>📊 15개 종목의 한국 대표 주식</p>
          <p>🎯 3라운드 동안의 투자 경험</p>
        </div> */}
      </div>
    </div>
  );
};

export default Register;
