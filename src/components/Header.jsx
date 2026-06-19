import { useState, useRef, useEffect } from 'react';
import { validateEmailDomain } from '../utils/email';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';

function Header({ currentUser, onLogin, onRegister, onLogout, onUpdateProfile, tab, onTabChange }) {
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const menuRef = useRef(null);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLogin(false);
        setShowProfile(false);
        setError('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setLoginEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setGender('masculino');
    setRecoveryEmail('');
    setRecoveryMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail.trim()) { setError('Digite seu email'); return; }
    if (!password) { setError('Digite sua senha'); return; }
    const result = await onLogin(loginEmail.trim(), password);
    if (result?.error) { setError(result.error); return; }
    resetForm();
    setShowLogin(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Digite seu nome'); return; }
    if (!email.trim()) { setError('Digite seu email'); return; }
    if (!password || password.length < 3) { setError('Senha deve ter no mínimo 3 caracteres'); return; }
    if (password !== confirmPassword) { setError('Senhas não conferem'); return; }
    const validation = await validateEmailDomain(email);
    if (!validation.valid) { setError(validation.error); return; }
    const result = await onRegister(name.trim(), email.trim(), password, gender);
    if (result?.error) { setError(result.error); return; }
    resetForm();
    setShowLogin(false);
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setRecoveryMsg('');
    if (!recoveryEmail.trim()) { setRecoveryMsg('Digite seu email'); return; }
    setRecoveryLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
      redirectTo: window.location.origin,
    });
    setRecoveryLoading(false);
    if (error) {
      setRecoveryMsg(error.message);
    } else {
      setRecoveryMsg('Email enviado! Verifique sua caixa de entrada.');
      setTimeout(() => { setShowLogin(false); resetForm(); }, 3000);
    }
  };

  const [gender, setGender] = useState('masculino');
  const [showProfile, setShowProfile] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setAvatarUrlInput(currentUser.profilePhoto || '');
    }
  }, [currentUser]);

  const handleSaveAvatar = async () => {
    const url = avatarUrlInput.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
      setProfileMsg('URL inválida. Use http:// ou https://');
      return;
    }
    const result = await onUpdateProfile(currentUser.name, { profilePhoto: url || '' });
    if (result?.ok) {
      setProfileMsg(url ? 'Foto salva!' : 'Foto removida!');
    }
    setTimeout(() => setProfileMsg(''), 2000);
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrlInput('');
    const result = await onUpdateProfile(currentUser.name, { profilePhoto: '' });
    if (result?.ok) {
      setProfileMsg('Foto removida!');
    }
    setTimeout(() => setProfileMsg(''), 2000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setProfileMsg('Imagem muito grande (máx 500KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarUrlInput(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setRecoveryMsg('');
  };

  const isAdmin = currentUser?.is_admin;

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Painel' },
    { id: 'matches', icon: '⚽', label: 'Jogos' },
    { id: 'standings', icon: '📋', label: 'Grupos' },
    { id: 'leaderboard', icon: '🏅', label: 'Ranking' },
    ...(isAdmin ? [{ id: 'admin', icon: '⚙️', label: 'Admin' }] : []),
  ];

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-brand" onClick={() => onTabChange('dashboard')}>
          <div className="header-brand-icon">
            <img src="/cbf.svg" alt="CBF" className="header-logo" />
          </div>
          <div className="header-title">
            <h1>Copa do Mundo <span>2026</span></h1>
            <span className="header-subtitle">Bolão de Palpites</span>
          </div>
        </div>

        <div className="header-user" ref={menuRef}>
          {currentUser ? (
            <div className="user-logged-in" onClick={() => { setShowProfile(!showProfile); setProfileMsg(''); setAvatarUrlInput(currentUser.profilePhoto || ''); }}>
              <Avatar user={currentUser} size={32} className="user-avatar" />
              <span className="user-name">{currentUser.name}</span>
              {isAdmin && <span className="user-badge-admin">ADMIN</span>}
              <span className="user-arrow">{showProfile ? '▲' : '▼'}</span>
              <button className="user-logout-btn" onClick={(e) => { e.stopPropagation(); onLogout(); }}>Sair</button>
            </div>
          ) : (
            <button className="user-btn user-btn-login" onClick={() => { setShowLogin(!showLogin); setError(''); }}>
              <span className="user-avatar user-avatar-login">+</span>
              <span className="user-name">Entrar / Registrar</span>
            </button>
          )}

          {showProfile && currentUser && (
            <div className="user-menu profile-menu">
              <h4 className="login-title">Minha Foto</h4>
              {profileMsg && <p className={`login-msg ${profileMsg.includes('salva') || profileMsg.includes('removida') ? 'success' : ''}`}>{profileMsg}</p>}
              <div className="profile-avatar-preview">
                <Avatar user={{ ...currentUser, profilePhoto: avatarUrlInput || currentUser.profilePhoto }} size={64} />
              </div>
              <input type="text" placeholder="URL da foto (https://...)" value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)} className="login-input" />
              <label className="profile-file-label">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="profile-file-input" />
                <span className="profile-file-btn">📁 Escolher arquivo</span>
              </label>
              <div className="profile-actions">
                <button className="login-submit" onClick={handleSaveAvatar} style={{ flex: 1 }}>Salvar</button>
                <button className="login-submit profile-remove-btn" onClick={handleRemoveAvatar}>✕</button>
              </div>
            </div>
          )}

          {showLogin && !currentUser && (
            <div className="user-menu">
              {mode === 'login' ? (
                <form className="login-form" onSubmit={handleLogin}>
                  <h4 className="login-title">Entrar</h4>
                  {error && <p className="login-error">{error}</p>}
                  <input type="email" placeholder="Email" value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)} autoFocus className="login-input" />
                  <input type="password" placeholder="Senha" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="login-input" />
                  <button type="button" className="login-link forgot-password"
                    onClick={() => switchMode('recovery')}>
                    Esqueci a senha?
                  </button>
                  <button type="submit" className="login-submit">Entrar</button>
                  <p className="login-hint">
                    Não tem conta?{' '}
                    <button type="button" className="login-link" onClick={() => switchMode('register')}>Cadastre-se</button>
                  </p>
                </form>
              ) : mode === 'recovery' ? (
                <form className="login-form" onSubmit={handleRecovery}>
                  <h4 className="login-title">Recuperar Senha</h4>
                  {recoveryMsg && (
                    <p className={`login-msg ${recoveryMsg.includes('enviado') ? 'success' : ''}`}>
                      {recoveryMsg}
                    </p>
                  )}
                  <input type="email" placeholder="Seu email de cadastro" value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)} autoFocus className="login-input" />
                  <button type="submit" className="login-submit" disabled={recoveryLoading}>
                    {recoveryLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                  <p className="login-hint">
                    <button type="button" className="login-link" onClick={() => switchMode('login')}>
                      Voltar ao login
                    </button>
                  </p>
                </form>
              ) : (
                <form className="login-form" onSubmit={handleRegister}>
                  <h4 className="login-title">Cadastrar</h4>
                  {error && <p className="login-error">{error}</p>}
                  <input type="text" placeholder="Nome" value={name}
                    onChange={(e) => setName(e.target.value)} autoFocus maxLength={30} className="login-input" />
                  <input type="email" placeholder="Email" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="login-input" />
                  <div className="login-gender">
                    <label className={`gender-option ${gender === 'masculino' ? 'active' : ''}`}>
                      <input type="radio" name="gender" value="masculino" checked={gender === 'masculino'}
                        onChange={(e) => setGender(e.target.value)} />
                      Masculino
                    </label>
                    <label className={`gender-option ${gender === 'feminino' ? 'active' : ''}`}>
                      <input type="radio" name="gender" value="feminino" checked={gender === 'feminino'}
                        onChange={(e) => setGender(e.target.value)} />
                      Feminino
                    </label>
                  </div>
                  <input type="password" placeholder="Senha (mín. 3 caracteres)" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="login-input" />
                  <input type="password" placeholder="Confirmar senha" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} className="login-input" />
                  <button type="submit" className="login-submit">Cadastrar</button>
                  <p className="login-hint">
                    Já tem conta?{' '}
                    <button type="button" className="login-link" onClick={() => switchMode('login')}>Entrar</button>
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="header-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${tab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

export default Header;
