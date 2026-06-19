import { useState, useCallback } from 'react';

const API = {
  login: '/api/login',
  register: '/api/register',
  data: '/api/data',
  savePredictions: '/api/save-predictions',
  setAdmin: '/api/set-admin',
  removeUser: '/api/remove-user',
  clearAll: '/api/clear-all',
  resetPassword: '/api/reset-password',
  updateProfile: '/api/update-profile',
  sync: '/api/sync',
  validateEmail: '/api/validate-email',
};

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

export function useStorage() {
  const [data, setData] = useState(() => ({
    users: [],
    predictions: {},
    currentUser: null,
  }));

  const getCurrentUser = useCallback(() => {
    if (!data.currentUser) return null;
    return data.users.find(u => u.name === data.currentUser) || null;
  }, [data.users, data.currentUser]);

  async function loadAllData() {
    try {
      const result = await apiGet(API.data);
      if (result.users) {
        const users = Object.values(result.users);
        const predictions = {};
        for (const [uname, preds] of Object.entries(result.predictions || {})) {
          predictions[uname] = Object.entries(preds).map(([matchId, p]) => ({
            matchId,
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            updatedAt: p.updatedAt || '',
          }));
        }
        setData(prev => ({
          ...prev,
          users,
          predictions,
        }));
      }
    } catch {}
  }

  const login = useCallback(async (name, password) => {
    try {
      const result = await apiPost(API.login, { name, password });
      if (!result.success) return { ok: false, error: result.error || 'Erro ao fazer login' };
      setData(prev => ({ ...prev, currentUser: result.user.name }));
      await loadAllData();
      return { ok: true, user: result.user };
    } catch {
      return { ok: false, error: 'Servidor indisponível' };
    }
  }, []);

  const register = useCallback(async (name, email, password, gender = 'masculino') => {
    try {
      const result = await apiPost(API.register, { name, email, password, gender });
      if (!result.success) return { ok: false, error: result.error || 'Erro ao cadastrar' };
      setData(prev => ({ ...prev, currentUser: result.user.name }));
      await loadAllData();
      return { ok: true, user: result.user };
    } catch {
      return { ok: false, error: 'Servidor indisponível' };
    }
  }, []);

  const logout = useCallback(() => {
    setData(prev => ({ ...prev, currentUser: null }));
  }, []);

  const addPrediction = useCallback(async (userName, matchId, homeScore, awayScore) => {
    try {
      const user = getCurrentUser();
      if (!user) return;
      const storageKey = user.name;
      const userPreds = data.predictions[storageKey] ? [...data.predictions[storageKey]] : [];
      const existingIdx = userPreds.findIndex(p => p.matchId === matchId);
      const pred = { matchId, homeScore: Number(homeScore), awayScore: Number(awayScore), updatedAt: new Date().toISOString() };
      if (existingIdx >= 0) {
        userPreds[existingIdx] = pred;
      } else {
        userPreds.push(pred);
      }
      setData(prev => ({
        ...prev,
        predictions: { ...prev.predictions, [storageKey]: userPreds },
      }));
      const predsObj = {};
      for (const p of userPreds) {
        predsObj[p.matchId] = { homeScore: p.homeScore, awayScore: p.awayScore };
      }
      await apiPost(API.savePredictions, { name: user.name, predictions: predsObj });
    } catch {}
  }, [data.predictions, getCurrentUser]);

  const getPrediction = useCallback((userName, matchId) => {
    const userPreds = data.predictions[userName];
    if (!userPreds) return null;
    return userPreds.find(p => p.matchId === matchId) || null;
  }, [data.predictions]);

  const getUserPredictions = useCallback((userName) => {
    return data.predictions[userName] || [];
  }, [data.predictions]);

  const setAdminStatus = useCallback(async (adminName, targetName, isAdmin) => {
    try {
      const result = await apiPost(API.setAdmin, { adminName, targetName, isAdmin });
      if (result.success) {
        setData(prev => ({
          ...prev,
          users: prev.users.map(u => u.name === targetName ? { ...u, isAdmin } : u),
        }));
      }
      return result;
    } catch {
      return { success: false, error: 'Servidor indisponível' };
    }
  }, []);

  const removeUser = useCallback(async (adminName, targetName) => {
    try {
      const result = await apiPost(API.removeUser, { adminName, targetName });
      if (result.success) {
        setData(prev => {
          const newPredictions = { ...prev.predictions };
          delete newPredictions[targetName];
          return {
            ...prev,
            users: prev.users.filter(u => u.name !== targetName),
            predictions: newPredictions,
            currentUser: prev.currentUser === targetName ? null : prev.currentUser,
          };
        });
      }
      return result;
    } catch {
      return { success: false, error: 'Servidor indisponível' };
    }
  }, []);

  const updateProfile = useCallback(async (userName, updates) => {
    try {
      const result = await apiPost(API.updateProfile, { name: userName, ...updates });
      if (result.success) {
        setData(prev => ({
          ...prev,
          users: prev.users.map(u => u.name === userName ? { ...u, ...result.user } : u),
        }));
        return { ok: true };
      }
      return { ok: false, error: result.error };
    } catch {
      return { ok: false, error: 'Servidor indisponível' };
    }
  }, []);

  const resetAll = useCallback(async (adminName) => {
    try {
      const result = await apiPost(API.clearAll, { adminName });
      if (result.success) {
        setData({ users: [], predictions: {}, currentUser: null });
      }
      return result;
    } catch {
      return { success: false };
    }
  }, []);

  const resetPassword = useCallback(async (adminName, targetName, newPassword) => {
    try {
      const result = await apiPost(API.resetPassword, { adminName, targetName, newPassword });
      return result;
    } catch {
      return { success: false, error: 'Servidor indisponível' };
    }
  }, []);

  const loadServerData = useCallback(async () => {
    await loadAllData();
  }, []);

  return {
    users: data.users,
    predictions: data.predictions,
    currentUser: data.currentUser,
    getCurrentUser,
    login,
    register,
    logout,
    setAdminStatus,
    removeUser,
    addPrediction,
    getPrediction,
    getUserPredictions,
    updateProfile,
    resetAll,
    resetPassword,
    loadServerData,
  };
}
