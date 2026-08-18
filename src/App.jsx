import React, { useState } from 'react';

// Données de démonstration
const MAIN_CATEGORIES = [
  { name: 'Plats', bg: 'bg-[#E8F1E8]', img: '/images/categories/plats.png' },
  { name: 'Viandes et poissons', bg: 'bg-[#FDEBE6]', img: '/images/categories/viandes.png' },
  { name: 'Accompagnements', bg: 'bg-[#FAF3DC]', img: '/images/categories/accompagnements.png' },
  { name: 'Entrées', bg: 'bg-[#E8F3EB]', img: '/images/categories/entrees.png' },
  { name: 'Desserts', bg: 'bg-[#F4EAF4]', img: '/images/categories/desserts.png' },
];

const QUICK_FILTERS = [
  { name: 'Tous', icon: '✨' },
  { name: 'Tartes & Quiches', icon: '🥧' },
  { name: 'Pâtes & Lasagnes', icon: '🍝' },
  { name: 'Mijotés', icon: '🍲' },
  { name: 'Rapide', icon: '⚡' },
];

const INITIAL_RECIPES = [
  {
    id: 1,
    title: 'Tarte au thon',
    category: 'Plats',
    subCategory: 'Tartes & Quiches',
    difficulty: 'Facile',
    servings: 4,
    prepTime: '40 min',
    image: '/images/recipes/tarte-thon.jpg',
    description: 'Une tarte savoureuse et rapide à préparer, parfaite pour un repas en famille !',
  },
  {
    id: 2,
    title: 'Lasagnes à la bolognaise',
    category: 'Plats',
    subCategory: 'Pâtes & Lasagnes',
    difficulty: 'Moyen',
    servings: 6,
    prepTime: '1h 15 min',
    image: '/images/recipes/lasagnes.jpg',
    description: 'Un grand classique généreux et réconfortant avec sa sauce mijotée.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes', 'planning', 'shopping'
  const [selectedMainCat, setSelectedMainCat] = useState(null);
  const [selectedSubCat, setSelectedSubCat] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipe, setActiveRecipe] = useState(null);

  // Filtrage des recettes
  const filteredRecipes = INITIAL_RECIPES.filter((recipe) => {
    const matchesMain = !selectedMainCat || recipe.category === selectedMainCat;
    const matchesSub = selectedSubCat === 'Tous' || recipe.subCategory === selectedSubCat;
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMain && matchesSub && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800 flex flex-col font-sans relative pb-28">

      {/* 1. EN-TÊTE CHALEUREUX */}
      <header className="px-5 pt-6 pb-2 flex justify-between items-center max-w-2xl mx-auto w-full">
        <button className="p-2.5 bg-white rounded-full shadow-sm text-slate-700 hover:bg-slate-50 transition">
          ☰
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-extrabold text-xl text-[#2C4A34] tracking-wide">GILMEAL</span>
        </div>
        <button className="p-2.5 bg-white rounded-full shadow-sm text-slate-700 hover:bg-slate-50 transition relative">
          👤
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#EF6A45] rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* 2. CONTENU PRINCIPAL */}
      <main className="px-4 space-y-6 max-w-2xl mx-auto w-full flex-1 mt-2">
        
        {activeTab === 'recipes' && (
          <>
            {/* SALUTATION */}
            <div>
              <span className="font-handwriting text-2xl text-[#3D6647] font-bold block mb-0.5">
                Bonjour ! ✨
              </span>
              <h1 className="text-2xl font-black text-slate-800 leading-tight">
                Qu'est-ce qu'on cuisine aujourd'hui ? <span className="text-[#EF6A45]">❤️</span>
              </h1>
            </div>

            {/* CARTOUCHE DE CATÉGORIES EN PASTEL */}
            <div className="grid grid-cols-5 gap-2 overflow-x-auto pb-1 scrollbar-none">
              {MAIN_CATEGORIES.map((cat) => {
                const isSelected = selectedMainCat === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedMainCat(isSelected ? null : cat.name)}
                    className={`${cat.bg} p-3 rounded-3xl flex flex-col items-center justify-between h-32 text-center transition-all transform hover:scale-105 shadow-sm border-2 ${
                      isSelected ? 'border-[#3D6647]' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={cat.img}
                      alt={cat.name}
                      className="w-12 h-12 object-contain my-auto"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* RECHERCHE ET BOUTON D'AJOUT ORANGE */}
            <div className="flex gap-2.5 items-center">
              <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm flex items-center gap-2 border border-slate-100">
                <span className="text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Qu'est-ce qu'on mange aujourd'hui ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-semibold focus:outline-none bg-transparent placeholder:text-slate-400"
                />
              </div>
              <button className="bg-[#EF6A45] hover:bg-[#d95a37] active:scale-95 text-white px-4 py-3 rounded-2xl shadow-sm text-xs font-bold flex items-center gap-1.5 shrink-0 transition">
                <span className="text-base leading-none">+</span> Ajouter
              </button>
            </div>

            {/* FILTRES RAPIDES */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_FILTERS.map((filter) => {
                const isSelected = selectedSubCat === filter.name;
                return (
                  <button
                    key={filter.name}
                    onClick={() => setSelectedSubCat(filter.name)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shadow-sm ${
                      isSelected
                        ? 'bg-[#2C4A34] text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span>{filter.name}</span>
                  </button>
                );
              })}
            </div>

            {/* LISTE DES RECETTES (CARTES CHALEUREUSES) */}
            <div className="space-y-4 pt-2">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-[28px] shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row transition hover:shadow-md"
                >
                  <div className="md:w-1/2 h-48 md:h-auto relative bg-slate-100">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-xs">
                      🤍
                    </button>
                  </div>
                  <div className="p-5 md:w-1/2 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="bg-[#FDF2E9] text-[#EF6A45] text-[10px] font-extrabold px-3 py-1 rounded-full inline-block mb-2">
                        ★ {recipe.difficulty}
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-800 leading-snug">
                        {recipe.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-1">
                        <span>👥 {recipe.servings} pers.</span>
                        <span>•</span>
                        <span>⏱️ {recipe.prepTime}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2.5 leading-relaxed font-medium">
                        {recipe.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveRecipe(recipe)}
                      className="bg-[#3D6647] hover:bg-[#2f5037] active:scale-95 text-white text-xs font-bold py-2.5 px-5 rounded-full w-fit transition flex items-center gap-2 shadow-sm"
                    >
                      Voir la recette ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VUE PLANNING */}
        {activeTab === 'planning' && (
          <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 text-center space-y-3">
            <span className="text-4xl">📅</span>
            <h2 className="text-xl font-extrabold text-slate-800">Planning de la semaine</h2>
            <p className="text-xs text-slate-500">Organise tes repas jours par jours.</p>
          </div>
        )}

        {/* VUE COURSES */}
        {activeTab === 'shopping' && (
          <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 text-center space-y-3">
            <span className="text-4xl">🛒</span>
            <h2 className="text-xl font-extrabold text-slate-800">Liste de courses</h2>
            <p className="text-xs text-slate-500">Tes ingrédients générés automatiquement.</p>
          </div>
        )}

      </main>

      {/* 3. BARRE DE NAVIGATION FLOTTANTE BOMBÉE */}
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex gap-6 bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full shadow-xl border border-slate-100 items-center">
          <button
            onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition ${
              activeTab === 'recipes' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'recipes' ? 'bg-[#E8F3EB]' : ''}`}>
              🏠
            </div>
            Accueil
          </button>

          <button
            onClick={() => setActiveTab('planning')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition ${
              activeTab === 'planning' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'planning' ? 'bg-[#E8F3EB]' : ''}`}>
              📅
            </div>
            Planning
          </button>

          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition ${
              activeTab === 'shopping' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'shopping' ? 'bg-[#E8F3EB]' : ''}`}>
              🛒
            </div>
            Courses
          </button>
        </nav>
      </div>

    </div>
  );
}