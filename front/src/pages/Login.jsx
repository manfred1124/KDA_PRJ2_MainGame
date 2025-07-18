import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { IntroContext } from "../App";
import { Eye, EyeOff, LogIn } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const { setShowIntro } = useContext(IntroContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/news", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(username, password);
    if (success) {
      localStorage.setItem("showIntro", "true");
      setShowIntro(true);
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="h-screen overflow-hidden flex items-center justify-center auth-page">
      <div className="max-w-md w-full space-y-5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">로그인</h2>
          <p className="mt-2 text-gray-600">주식 투자 시뮬레이션 게임</p>
        </div>

        {/* card div 제거, 내부 내용만 남김 */}
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
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn size={20} />
                <span>로그인</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{" "}
            <Link
              to="/register"
              className="text-blue-300 text-primary-600 hover:text-primary-700 font-medium"
            >
              회원가입
            </Link>
          </p>
        </div>

        {/* <div className="text-center text-sm text-gray-300">
          <p>🎯 2020년부터 2024년까지의 주식 시장을 시뮬레이션</p>
          <p>📈 실제 주식 데이터 기반의 교육용 게임</p>
          <p>🏆 다른 플레이어들과 경쟁하며 투자 실력 향상</p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
