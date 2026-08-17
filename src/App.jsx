import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const MAIN_CATEGORIES = ['Plats', 'Viandes et poissons', 'Accompagnements', 'Entrées', 'Desserts'];
const SUB_CATEGORIES = {
  'Plats': ['Tous', 'Tartes & Quiches', 'Pâtes & Lasagnes', 'Mijotés'],
  'Viandes et poissons': ['Tous', 'Viande', 'Poisson', 'Volaille'],
  'Accompagnements': ['Tous', 'Légumes', 'Féculents'],
  'Entrées': ['Tous'],
  'Desserts': ['Tous'],
};

const DAYS = [
  { id: 1, label: 'Jour 1' },
  { id: 2, label: 'Jour 2' },
  { id: 3, label: 'Jour 3' },
  { id: 4, label: 'Jour 4' },
  { id: 5, label: 'Jour 5' },
  { id: 6, label: 'Jour 6' },
];

export default function App() {
  // Navigation principale
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes', 'planning', 'shopping'

  // --- ÉTATS RECETTES ---
  const [recipes, setRecipes] = useState([]);
  const [selectedMainCat, setSelectedMainCat] = useState('Plats');
  const [selectedSubCat, setSelectedSubCat] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipe, setActiveRecipe] = useState(null); // Recette ouverte dans la vue détail
  const [recipeDetailTab, setRecipeDetailTab] = useState('ingredients'); // 'ingredients' ou 'instructions'

  // --- ÉTATS PLANNING (Dual: Lista + Agenda) ---
  const [plannedMeals, setPlannedMeals] = useState(() => {
    const saved = localStorage.getItem('planned_meals_v2');
    return saved ? JSON.parse(saved) : []; 
    // Structure: [{ id, recipeId, recipeTitle, guests: 2, dayId: null, slot: null }] (slot: 'M' ou 'S')
  });

  const [agenda, setAgenda] = useState(() => {
    const saved = localStorage.getItem('agenda_v2');
    return saved ? JSON.parse(saved) : {}; 
    // Format: { '1-M': plannedMealId, '1-S': plannedMealId }
  });

  const [planningSubTab, setPlanningSubTab] = useState('meals'); // 'meals' ou 'agenda'

  useEffect(() => {
    localStorage.setItem('planned_meals_v2', JSON.stringify(plannedMeals));
  }, [plannedMeals]);

  useEffect(() => {
    localStorage.setItem('agenda_v2', JSON.stringify(agenda));
  }, [agenda]);

  // --- CHARGEMENT SUPABASE ---
  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recipes').select('*').order('id', { ascending: false });
    if (data) setRecipes(data);
  };

  // --- FILTRAGE DES RECETTES ---
  const filteredRecipes = recipes.filter((r) => {
    const matchMain = (r.category || 'Plats') === selectedMainCat;
    const matchSub = selectedSubCat === 'Tous' || r.subCategory === selectedSubCat;
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMain && matchSub && matchSearch;
  });

  // --- ACTIONS PLANNING ---
  const addRecipeToPlanning = (recipe) => {
    const newItem = {
      id: Date.now(),
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      ingredients: recipe.ingredients || [],
      guests: 2,
      assignedDay: null,
      assignedSlot: null,
    };
    setPlannedMeals([...plannedMeals, newItem]);
    alert(`"${recipe.title}" a été ajouté à la liste des repas !`);
  };

  const updateGuests = (id, delta) => {
    setPlannedMeals(
      plannedMeals.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.guests + delta);
          return { ...item, guests: newQty };
        }
        return item;
      })
    );
  };

  const assignMealToAgenda = (dayId, slot, mealId) => {
    const key = `${dayId}-${slot}`;
    setAgenda((prev) => ({ ...prev, [key]: mealId ? Number(mealId) : null }));

    // Mettre à jour le statut du repas
    setPlannedMeals((prev) =>
      prev.map((meal) => {
        if (meal.id === Number(mealId)) {
          return { ...meal, assignedDay: dayId, assignedSlot: slot };
        }
        return meal;
      })
    );
  };

  // --- CALCUL DE LA LISTE DE COURSES ---
  const getShoppingList = () => {
    const totals = {};
    plannedMeals.forEach((meal) => {
      const ratio = meal.guests / 2; // Ratio basé sur 2 personnes de base
      meal.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase().trim();
        const qty = (Number(ing.quantity) || 0) * ratio;
        if (totals[key]) {
          totals[key].quantity += qty;
        } else {
          totals[key] = { name: ing.name, quantity: qty };
        }
      });
    });
    return Object.values(totals);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* BARRE DE NAVIGATION EN HAUT */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex justify-between items-center p-3">
          <h1 className="font-bold text-lg tracking-wide">🥗 Popote & Co</h1>
          <nav className="flex gap-1 bg-emerald-800/50 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'recipes' ? 'bg-white text-emerald-800 shadow' : 'text-emerald-100'
              }`}
            >
              Recettes
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'planning' ? 'bg-white text-emerald-800 shadow' : 'text-emerald-100'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'shopping' ? 'bg-white text-emerald-800 shadow' : 'text-emerald-100'
              }`}
            >
              Panier
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* ========================================================= */}
        {/* 1. SECTION RECETTES                                      */}
        {/* ========================================================= */}
        {activeTab === 'recipes' && !activeRecipe && (
          <div className="space-y-4">
            {/* Niveau 1 : Catégories Principales */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {MAIN_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedMainCat(cat);
                    setSelectedSubCat('Tous');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedMainCat === cat
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Niveau 2 : Sous-Catégories */}
            {SUB_CATEGORIES[selectedMainCat] && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SUB_CATEGORIES[selectedMainCat].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubCat(sub)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedSubCat === sub
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Recherche */}
            <input
              type="text"
              placeholder="🔍 Rechercher une recette..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Liste des cartes recettes */}
            <div className="grid gap-3">
              {filteredRecipes.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">Aucune recette disponible.</p>
              ) : (
                filteredRecipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveRecipe(r)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:border-emerald-500 transition"
                  >
                    <span className="font-bold text-slate-800">{r.title}</span>
                    <span className="text-slate-400 text-sm">➜</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- DÉTAIL D'UNE RECETTE SELECTIONNÉE --- */}
        {activeTab === 'recipes' && activeRecipe && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <button
              onClick={() => setActiveRecipe(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              ⬅ Retour aux recettes
            </button>

            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold text-slate-800">{activeRecipe.title}</h2>
              <button
                onClick={() => addRecipeToPlanning(activeRecipe)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow"
              >
                + Ajout panier
              </button>
            </div>

            {/* Onglets Fiche Recette : Ingrédients / Instructions */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setRecipeDetailTab('ingredients')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 ${
                  recipeDetailTab === 'ingredients'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Ingrédients
              </button>
              <button
                onClick={() => setRecipeDetailTab('instructions')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 ${
                  recipeDetailTab === 'instructions'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Recette / Étapes
              </button>
            </div>

            {recipeDetailTab === 'ingredients' ? (
              <ul className="space-y-2">
                {activeRecipe.ingredients?.map((ing, i) => (
                  <li key={i} className="flex justify-between text-sm border-b border-slate-50 py-1">
                    <span className="text-slate-700">{ing.name}</span>
                    <span className="font-bold text-emerald-700">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                {activeRecipe.instructions || 'Aucune étape renseignée pour cette recette.'}
              </p>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SECTION PLANNING (Liste des repas & Agenda)           */}
        {/* ========================================================= */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            {/* Sous-Onglets : Liste des repas / Agenda */}
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button
                onClick={() => setPlanningSubTab('meals')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  planningSubTab === 'meals' ? 'bg-white text-slate-800 shadow' : 'text-slate-600'
                }`}
              >
                Liste des repas
              </button>
              <button
                onClick={() => setPlanningSubTab('agenda')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  planningSubTab === 'agenda' ? 'bg-white text-slate-800 shadow' : 'text-slate-600'
                }`}
              >
                Agenda
              </button>
            </div>

            {/* --- VUE A : LISTE DES REPAS --- */}
            {planningSubTab === 'meals' && (
              <div className="space-y-3">
                {plannedMeals.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">
                    Aucun repas sélectionné. Allez dans "Recettes" et cliquez sur "+ Ajout panier".
                  </p>
                ) : (
                  plannedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center gap-3"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{meal.recipeTitle}</h4>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 ${
                            meal.assignedDay
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {meal.assignedDay
                            ? `Jour ${meal.assignedDay} (${meal.assignedSlot})`
                            : 'N/A : Non affecté'}
                        </span>
                      </div>

                      {/* Compteur Nombre de Personnes */}
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => updateGuests(meal.id, -1)}
                          className="w-6 h-6 bg-white rounded font-bold text-slate-600 shadow-xs text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-700">{meal.guests} pers</span>
                        <button
                          onClick={() => updateGuests(meal.id, 1)}
                          className="w-6 h-6 bg-white rounded font-bold text-slate-600 shadow-xs text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* --- VUE B : AGENDA (Grille 6 jours - Midi / Soir) --- */}
            {planningSubTab === 'agenda' && (
              <div className="grid gap-3">
                {DAYS.map((day) => (
                  <div key={day.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <span className="font-bold text-xs text-emerald-700 uppercase tracking-wider">
                      {day.label}
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {['M', 'S'].map((slot) => {
                        const key = `${day.id}-${slot}`;
                        const currentMealId = agenda[key] || '';
                        const isAssigned = Boolean(currentMealId);

                        return (
                          <div
                            key={slot}
                            className={`p-2 rounded-lg border text-xs flex flex-col gap-1 transition ${
                              isAssigned
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <span className="font-bold text-slate-500">
                              {slot === 'M' ? 'Midi' : 'Soir'}
                            </span>

                            <select
                              value={currentMealId}
                              onChange={(e) => assignMealToAgenda(day.id, slot, e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1 text-xs text-slate-700 focus:outline-none"
                            >
                              <option value="">-- Cliquer pour affecter --</option>
                              {plannedMeals.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.recipeTitle} ({m.guests}p)
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SECTION PANIER / COURSES                               */}
        {/* ========================================================= */}
        {activeTab === 'shopping' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">🛒 Liste de courses finale</h2>
            {getShoppingList().length === 0 ? (
              <p className="text-slate-400 text-sm">
                Aucun ingrédient dans le panier. Ajoutez des recettes au planning.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {getShoppingList().map((item, index) => (
                  <li key={index} className="py-2.5 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-slate-700 capitalize text-sm font-medium">{item.name}</span>
                    </label>
                    <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full">
                      x {Math.round(item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}