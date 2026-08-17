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
  const [activeTab, setActiveTab] = useState('recipes');

  // --- ÉTATS RECETTES ---
  const [recipes, setRecipes] = useState([]);
  const [selectedMainCat, setSelectedMainCat] = useState('Plats');
  const [selectedSubCat, setSelectedSubCat] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [recipeDetailTab, setRecipeDetailTab] = useState('ingredients');

  // --- ÉTATS CRÉATION / ÉDITION ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Plats');
  const [formSubCategory, setFormSubCategory] = useState('Tartes & Quiches');
  const [formServings, setFormServings] = useState(4); // Nombre de personnes de base
  const [formIngredients, setFormIngredients] = useState([{ name: '', quantity: '' }]);
  const [formInstructions, setFormInstructions] = useState('');

  // --- ÉTATS SELECTION NOMBRE DE PERSONNES ---
  const [selectedGuests, setSelectedGuests] = useState(4);

  // --- ÉTATS PLANNING (Dual: Lista + Agenda) ---
  const [plannedMeals, setPlannedMeals] = useState(() => {
    const saved = localStorage.getItem('planned_meals_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [agenda, setAgenda] = useState(() => {
    const saved = localStorage.getItem('agenda_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [planningSubTab, setPlanningSubTab] = useState('meals');

  useEffect(() => {
    localStorage.setItem('planned_meals_v2', JSON.stringify(plannedMeals));
  }, [plannedMeals]);

  useEffect(() => {
    localStorage.setItem('agenda_v2', JSON.stringify(agenda));
  }, [agenda]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recipes').select('*').order('id', { ascending: false });
    if (data) setRecipes(data);
  };

  // Synchronise le sélecteur de personnes quand on ouvre une fiche
  useEffect(() => {
    if (activeRecipe) {
      setSelectedGuests(activeRecipe.servings || 4);
    }
  }, [activeRecipe]);

  // --- FORMULAIRE ---
  const openCreateForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormCategory('Plats');
    setFormSubCategory('Tartes & Quiches');
    setFormServings(4);
    setFormIngredients([{ name: '', quantity: '' }]);
    setFormInstructions('');
    setIsFormOpen(true);
  };

  const openEditForm = (recipe) => {
    setEditingId(recipe.id);
    setFormTitle(recipe.title);
    setFormCategory(recipe.category || 'Plats');
    setFormSubCategory(recipe.subCategory || 'Tous');
    setFormServings(recipe.servings || 4);
    setFormIngredients(
      recipe.ingredients?.length > 0
        ? JSON.parse(JSON.stringify(recipe.ingredients))
        : [{ name: '', quantity: '' }]
    );
    setFormInstructions(recipe.instructions || '');
    setIsFormOpen(true);
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...formIngredients];
    updated[index][field] = value;
    setFormIngredients(updated);
  };

  const addIngredientField = () => {
    setFormIngredients([...formIngredients, { name: '', quantity: '' }]);
  };

  const removeIngredientField = (index) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const filteredIngs = formIngredients.filter((ing) => ing.name.trim() !== '');

    const recipeData = {
      title: formTitle,
      category: formCategory,
      subCategory: formSubCategory,
      servings: Number(formServings) || 4,
      ingredients: filteredIngs,
      instructions: formInstructions,
    };

    if (editingId) {
      const { error } = await supabase.from('recipes').update(recipeData).eq('id', editingId);
      if (error) {
        alert(`Erreur lors de la modification : ${error.message}`);
        return;
      }
      setRecipes(recipes.map((r) => (r.id === editingId ? { ...r, ...recipeData } : r)));
      if (activeRecipe?.id === editingId) {
        setActiveRecipe({ ...activeRecipe, ...recipeData });
      }
    } else {
      const { data, error } = await supabase.from('recipes').insert([recipeData]).select();
      if (error) {
        alert(`Erreur lors de la création : ${error.message}`);
        return;
      }
      if (data) {
        setRecipes([data[0], ...recipes]);
      }
    }

    setIsFormOpen(false);
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette recette ?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) {
      setRecipes(recipes.filter((r) => r.id !== id));
      setActiveRecipe(null);
    }
  };

  // --- FILTRAGE ---
  const filteredRecipes = recipes.filter((r) => {
    const matchMain = (r.category || 'Plats') === selectedMainCat;
    const matchSub = selectedSubCat === 'Tous' || r.subCategory === selectedSubCat;
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMain && matchSub && matchSearch;
  });

  // --- PLANNING & COURSES ---
  const addRecipeToPlanning = (recipe) => {
    const newItem = {
      id: Date.now(),
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      baseServings: recipe.servings || 4,
      ingredients: recipe.ingredients || [],
      guests: selectedGuests,
      assignedDay: null,
      assignedSlot: null,
    };
    setPlannedMeals([...plannedMeals, newItem]);
    alert(`"${recipe.title}" (${selectedGuests} pers.) ajouté au panier !`);
  };

  const updateGuests = (id, delta) => {
    setPlannedMeals(
      plannedMeals.map((item) =>
        item.id === id ? { ...item, guests: Math.max(1, item.guests + delta) } : item
      )
    );
  };

  const assignMealToAgenda = (dayId, slot, mealId) => {
    const key = `${dayId}-${slot}`;
    setAgenda((prev) => ({ ...prev, [key]: mealId ? Number(mealId) : null }));

    setPlannedMeals((prev) =>
      prev.map((meal) =>
        meal.id === Number(mealId) ? { ...meal, assignedDay: dayId, assignedSlot: slot } : meal
      )
    );
  };

  const getShoppingList = () => {
    const totals = {};
    plannedMeals.forEach((meal) => {
      const baseServings = meal.baseServings || 4;
      const ratio = meal.guests / baseServings;
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
      {/* BARRE DE NAVIGATION AVEC LOGO */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex justify-between items-center p-3">
          {/* Remplacement par votre Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}>
            <img 
              src="/logo.png" 
              alt="Logo Popote & Co" 
              className="h-9 w-auto object-contain rounded-lg"
              onError={(e) => {
                // Secours visuel si le fichier logo.png n'existe pas encore dans /public
                e.target.style.display = 'none';
              }}
            />
            <span className="font-bold text-lg tracking-wide hidden sm:inline">Popote & Co</span>
          </div>

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
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Catalogue</h2>
              <button
                onClick={openCreateForm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition"
              >
                + Nouvelle Recette
              </button>
            </div>

            {/* Catégories Principales */}
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

            {/* Sous-Catégories */}
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

            {/* Cartes recettes */}
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
                    <div>
                      <span className="font-bold text-slate-800 block">{r.title}</span>
                      <span className="text-[11px] text-slate-400">
                        Portion de base : {r.servings || 4} pers.
                      </span>
                    </div>
                    <span className="text-slate-400 text-sm">➜</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- DÉTAIL D'UNE RECETTE SÉLECTIONNÉE --- */}
        {activeTab === 'recipes' && activeRecipe && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveRecipe(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ⬅ Retour aux recettes
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditForm(activeRecipe)}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => deleteRecipe(activeRecipe.id)}
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">{activeRecipe.title}</h2>
              <p className="text-xs text-slate-500">
                Recette créée pour <strong className="text-slate-700">{activeRecipe.servings || 4} pers.</strong>
              </p>
            </div>

            {/* CHOIX DU NOMBRE DE PERSONNES POUR LE PANIER */}
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900">
                Préparer pour :
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg p-1">
                  <button
                    onClick={() => setSelectedGuests(Math.max(1, selectedGuests - 1))}
                    className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2">
                    {selectedGuests} pers.
                  </span>
                  <button
                    onClick={() => setSelectedGuests(selectedGuests + 1)}
                    className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded font-bold text-xs"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => addRecipeToPlanning(activeRecipe)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow"
                >
                  + Ajout panier
                </button>
              </div>
            </div>

            {/* Onglets Fiche Recette */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setRecipeDetailTab('ingredients')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 ${
                  recipeDetailTab === 'ingredients'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Ingrédients ({selectedGuests} pers.)
              </button>
              <button
                onClick={() => setRecipeDetailTab('instructions')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 ${
                  recipeDetailTab === 'instructions'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Étapes de recette
              </button>
            </div>

            {recipeDetailTab === 'ingredients' ? (
              <ul className="space-y-2">
                {activeRecipe.ingredients?.map((ing, i) => {
                  const baseServings = activeRecipe.servings || 4;
                  const calculatedQty = (Number(ing.quantity) || 0) * (selectedGuests / baseServings);
                  return (
                    <li key={i} className="flex justify-between text-sm border-b border-slate-50 py-1">
                      <span className="text-slate-700">{ing.name}</span>
                      <span className="font-bold text-emerald-700">
                        {calculatedQty ? Math.round(calculatedQty * 10) / 10 : ing.quantity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                {activeRecipe.instructions || 'Aucune étape renseignée pour cette recette.'}
              </p>
            )}
          </div>
        )}

        {/* --- MODALE FORMULAIRE DE CRÉATION / ÉDITION --- */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingId ? 'Modifier la recette' : 'Créer une recette'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRecipe} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Catégorie
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        setFormCategory(e.target.value);
                        setFormSubCategory(SUB_CATEGORIES[e.target.value]?.[0] || 'Tous');
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {MAIN_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Sous-Cat.
                    </label>
                    <select
                      value={formSubCategory}
                      onChange={(e) => setFormSubCategory(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {SUB_CATEGORIES[formCategory]?.map((sc) => (
                        <option key={sc} value={sc}>{sc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Base Pers.
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formServings}
                      onChange={(e) => setFormServings(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Ingrédients (Quantité pour {formServings} pers.)
                  </label>
                  {formIngredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Ingrédient"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qté"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(i, 'quantity', e.target.value)}
                        className="w-20 p-2 border border-slate-200 rounded-lg text-sm"
                      />
                      {formIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientField(i)}
                          className="text-red-500 font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addIngredientField}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    + Ajouter un ingrédient
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Étapes de préparation (Optionnel)
                  </label>
                  <textarea
                    rows="3"
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SECTION PLANNING (Liste des repas & Agenda)           */}
        {/* ========================================================= */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
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

                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => updateGuests(meal.id, -1)}
                          className="w-6 h-6 bg-white rounded font-bold text-slate-600 text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-700">{meal.guests} pers</span>
                        <button
                          onClick={() => updateGuests(meal.id, 1)}
                          className="w-6 h-6 bg-white rounded font-bold text-slate-600 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

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
                      x {Math.round(item.quantity * 10) / 10}
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