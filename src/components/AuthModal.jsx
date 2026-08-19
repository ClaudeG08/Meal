import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Ajustez le chemin selon votre structure

export default function AuthModal({ isOpen, onClose, onGuestLogin }) {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (mode === 'signup') {
        // 1. Inscription
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Si l'inscription réussit, mettre à jour le pseudo dans 'profiles'
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ username })
            .eq('id', data.user.id);
        }

        setMessage({
          type: 'success',
          text: 'Compte créé ! Vérifiez votre boîte mail pour confirmer l\'inscription.'
        });
      } else if (mode === 'login') {
        // 2. Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      } else if (mode === 'forgot') {
        // 3. Réinitialisation de mot de passe
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Un e-mail de réinitialisation vous a été envoyé.'
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>
          {mode === 'login' && 'Connexion'}
          {mode === 'signup' && 'Créer un compte'}
          {mode === 'forgot' && 'Mot de passe oublié'}
        </h2>

        {message.text && (
          <div style={message.type === 'error' ? styles.error : styles.success}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Pseudo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
            />
          )}

          <input
            type="email"
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'S\'inscrire' : 'Envoyer le lien'}
          </button>
        </form>

        {/* Liens de bascule entre les modes */}
        <div style={styles.links}>
          {mode === 'login' && (
            <>
              <p>
                Pas encore de compte ?{' '}
                <button type="button" onClick={() => setMode('signup')} style={styles.linkBtn}>
                  S'inscrire
                </button>
              </p>
              <p>
                <button type="button" onClick={() => setMode('forgot')} style={styles.linkBtn}>
                  Mot de passe oublié ?
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <p>
              Déjà un compte ?{' '}
              <button type="button" onClick={() => setMode('login')} style={styles.linkBtn}>
                Se connecter
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              <button type="button" onClick={() => setMode('login')} style={styles.linkBtn}>
                Retour à la connexion
              </button>
            </p>
          )}
        </div>

        <hr style={{ margin: '20px 0' }} />

        {/* Bouton Invité */}
        <button
          type="button"
          onClick={() => {
            onGuestLogin();
            onClose();
          }}
          style={styles.guestBtn}
        >
          Continuer en tant qu'invité
        </button>
      </div>
    </div>
  );
}

// Styles simples d'exemple (à adapter selon votre CSS/Tailwind)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' },
  input: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc' },
  submitBtn: { padding: '10px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  guestBtn: { padding: '10px', backgroundColor: '#e0e0e0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' },
  linkBtn: { background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' },
  links: { marginTop: '12px', fontSize: '14px' },
  error: { color: 'red', marginBottom: '10px' },
  success: { color: 'green', marginBottom: '10px' },
};