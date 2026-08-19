import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthModal({ isOpen, onClose, onGuestLogin, initialView = 'welcome' }) {
  // 'welcome' | 'login' | 'signup_step1' | 'signup_step2' | 'forgot' | 'reset_password'
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Mettre à jour la vue si initialView change (ex: redirection suite au lien e-mail)
  React.useEffect(() => {
    setView(initialView);
  }, [initialView]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setErrorMsg("Identifiants invalides ou problème de connexion.");
    } else {
      resetForm();
      onClose();
    }
  };

  const handleCheckEmailAndNext = (e) => {
    e.preventDefault();
    if (!email) return;
    setErrorMsg('');
    setView('signup_step2');
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Compte créé ! Vous pouvez maintenant vous connecter.");
      setTimeout(() => {
        setView('login');
        setSuccessMsg('');
      }, 2000);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Veuillez saisir votre e-mail.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Redirige vers l'URL actuelle de votre application
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Un e-mail de réinitialisation vous a été envoyé.");
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Mot de passe modifié avec succès ! Vous pouvez à présent continuer.");
      setTimeout(() => {
        resetForm();
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative border border-slate-100">
        
        {/* LOGO ET ENTÊTE */}
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="Gil'Meal" className="h-16 mx-auto object-contain" />
          <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-slate-100">
            <span className="font-handwriting text-2xl text-[#3D6647] font-bold block">Bonjour !</span>
            <p className="text-xs font-extrabold text-slate-700">Qu'est-ce qu'on cuisine aujourd'hui ?</p>
          </div>
        </div>

        {errorMsg && <p className="text-xs font-bold text-red-500 text-center bg-red-50 p-2 rounded-xl">{errorMsg}</p>}
        {successMsg && <p className="text-xs font-bold text-green-600 text-center bg-green-50 p-2 rounded-xl">{successMsg}</p>}

        {/* VUE ACCUEIL / SÉLECTION */}
        {view === 'welcome' && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => { resetForm(); setView('login'); }}
              className="w-full bg-[#3D6647] text-white py-3 rounded-2xl text-xs font-extrabold hover:bg-[#2C4A34] transition shadow-sm"
            >
              Connexion
            </button>
            <button
              onClick={() => { resetForm(); setView('signup_step1'); }}
              className="w-full bg-[#FAF3DC] text-[#8a6d1f] py-3 rounded-2xl text-xs font-extrabold hover:bg-[#f5ecc9] transition shadow-sm"
            >
              Créer un compte
            </button>
            <button
              onClick={onGuestLogin}
              className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl text-xs font-extrabold hover:bg-slate-200 transition"
            >
              Continuer en tant qu'invité
            </button>
          </div>
        )}

        {/* VUE CONNEXION */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <h4 className="text-center font-extrabold text-sm text-[#EF6A45]">Connexion</h4>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D6647] text-white py-3 rounded-2xl text-xs font-extrabold hover:bg-[#2C4A34] transition"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-1">
              <button type="button" onClick={() => setView('forgot')} className="hover:underline">
                Mot de passe oublié ?
              </button>
              <button type="button" onClick={() => setView('welcome')} className="hover:underline text-slate-600">
                ⬅ Retour
              </button>
            </div>
          </form>
        )}

        {/* VUE CRÉATION COMPTE - ÉTAPE 1 (EMAIL) */}
        {view === 'signup_step1' && (
          <form onSubmit={handleCheckEmailAndNext} className="space-y-3">
            <h4 className="text-center font-extrabold text-sm text-[#EF6A45]">Créer un compte</h4>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D6647] text-white py-3 rounded-2xl text-xs font-extrabold hover:bg-[#2C4A34] transition"
            >
              Suivant
            </button>
            <button type="button" onClick={() => setView('welcome')} className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline">
              ⬅ Annuler
            </button>
          </form>
        )}

        {/* VUE CRÉATION COMPTE - ÉTAPE 2 (IDENTIFIANT ET MOT DE PASSE) */}
        {view === 'signup_step2' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <h4 className="text-center font-extrabold text-sm text-[#EF6A45]">Choix identifiant & MDP</h4>
            <input
              type="email"
              value={email}
              disabled
              className="w-full p-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl text-xs font-semibold cursor-not-allowed"
            />
            <input
              type="text"
              placeholder="Entrer un identifiant public (Pseudo)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Entrer un mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Confirmer mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D6647] text-white py-3 rounded-2xl text-xs font-extrabold hover:bg-[#2C4A34] transition"
            >
              {loading ? 'Création...' : 'Valider & Créer'}
            </button>
            <button type="button" onClick={() => setView('signup_step1')} className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline">
              ⬅ Revenir à l'email
            </button>
          </form>
        )}

        {/* VUE DEMANDE DE RÉINITIALISATION */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <h4 className="text-center font-extrabold text-sm text-[#EF6A45]">Réinitialisation</h4>
            <input
              type="email"
              placeholder="Saisissez votre email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D6647] text-white py-3 rounded-2xl text-xs font-extrabold hover:bg-[#2C4A34] transition"
            >
              {loading ? 'Envoi...' : 'Envoyer lien de réinitialisation'}
            </button>
            <button type="button" onClick={() => setView('login')} className="w-full text-center text-[10px] font-bold text-slate-400 hover:underline">
              ⬅ Retour connexion
            </button>
          </form>
        )}

        {/* VUE NOUVEAU MOT DE PASSE (APRS CLIC SUR LE LIEN EMAIL) */}
        {view === 'reset_password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <h4 className="text-center font-extrabold text-sm text-[#EF6A45]">Nouveau mot de passe</h4>
            <p className="text-[11px] text-[#3D6647] font-semibold text-center">
              Saisissez votre nouveau mot de passe ci-dessous.
            </p>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D6647] text-white py-3 rounded-2xl text-xs font-extrabold hover:bg-[#2C4A34] transition"
            >
              {loading ? 'Mise à jour...' : 'Valider le mot de passe'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}