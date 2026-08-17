import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEALS = ['Déjeuner', 'Dîner'];
const CATEGORIES = ['Toutes', 'Entrée', 'Plat', 'Dessert', 'Snack'];

export default function App() {
  // --- ÉTATS DE NAVIGATION ---
  const [currentView, setCurrentView] = useState('recipes-list'); // 'recipes-list', 'recipes-add', 'planning-week', 'shopping-list'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState('recipes'); // 'recipes', 'planning', 'shopping'

  // --- ÉTATS DES DONNÉES ---
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Toutes');

  // --- PLANNING (localStorage) ---
  const [planning, setPlanning] = useState(() => {
    const saved = localStorage.getItem('meal_planner_planning');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('meal_planner_planning', JSON.stringify(planning));
  }, [planning]);

  // --- CHARGER LES RECETTES ---
  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('id', { ascending: false });

    if (!error) {
      setRecipes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // --- FORMULAIRE RECETTES ---
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Plat');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const removeIngredientField = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Plat');
    setIngredients([{ name: '', quantity: '' }]);
    setEditingRecipeId(null);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const filteredIngs = ingredients.filter((ing) => ing.name.trim() !== '');

    if (editingRecipeId) {
      const { error } = await supabase
        .from('recipes')
        .update({ title, category, ingredients: filteredIngs })
        .eq('id', editingRecipeId);

      if (!error) {
        setRecipes(
          recipes.map((r) =>
            r.id === editingRecipeId ? { ...r, title, category, ingredients: filteredIngs } : r
          )
        );
        resetForm();
        setCurrentView('recipes-list');
      }
    } else {
      const { data, error } = await supabase
        .from('recipes')
        .insert([{ title, category, ingredients: filteredIngs }])
        .select();

      if (!error && data) {
        setRecipes([data[0], ...recipes]);
        resetForm();
        setCurrentView('recipes-list');
      }
    }
  };

  const startEdit = (recipe) => {
    setEditingRecipeId(recipe.id);
    setTitle(recipe.title);
    setCategory(recipe.category || 'Plat');
    setIngredients(
      recipe.ingredients.length > 0
        ? JSON.parse(JSON.stringify(recipe.ingredients))
        : [{ name: '', quantity: '' }]
    );
    setCurrentView('recipes-add');
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm('Supprimer cette recette ?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) {
      setRecipes(recipes.filter((r) => r.id !== id));
    }
  };

  // --- PLANNING ---
  const handleMealSelect = (day, meal, recipeId) => {
    setPlanning((prev) => ({
      ...prev,
      [`${day}-${meal}`]: recipeId ? Number(recipeId) : null,
    }));
  };

  // --- PANIER ---
  const getShoppingList = () => {
    const totals = {};
    Object.values(planning).forEach((recipeId) => {
      if (!recipeId) return;
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase().trim();
        const qty = Number(ing.quantity) || 0;
        if (totals[key]) {
          totals[key].quantity += qty;
        } else {
          totals[key] = { name: ing.name, quantity: qty };
        }
      });
    });
    return Object.values(totals);
  };

  const filteredRecipes =
    selectedCategory === 'Toutes'
      ? recipes
      : recipes.filter((r) => (r.category || 'Plat') === selectedCategory);

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-emerald-600 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-emerald-700 focus:outline-none transition"
        >
          <span className="text-2xl">☰</span>
        </button>
        <h1 className="text-lg font-bold tracking-wide">🥗 Popote & Co</h1>
        <div className="w-8"></div>
      </header>

      {/* OVERLAY & SIDEBAR MENU */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 bg-emerald-600 text-white font-bold text-xl flex justify-between items-center">
          <span>Navigation</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-2xl">
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* MENU RECETTES */}
          <div>
            <button
              onClick={() => setOpenSubmenu(openSubmenu === 'recipes' ? '' : 'recipes')}
              className="w-full flex justify-between items-center p-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">📖 Recettes</span>
              <span>{openSubmenu === 'recipes' ? '▲' : '▼'}</span>
            </button>
            {openSubmenu === 'recipes' && (
              <div className="ml-4 pl-3 border-l-2 border-emerald-200 space-y-1 mt-1">
                <button
                  onClick={() => navigateTo('recipes-list')}
                  className={`w-full text-left p-2 text-sm rounded-lg ${
                    currentView === 'recipes-list'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📋 Voir toutes les recettes
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    navigateTo('recipes-add');
                  }}
                  className={`w-full text-left p-2 text-sm rounded-lg ${
                    currentView === 'recipes-add' && !editingRecipeId
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ➕ Ajouter une recette
                </button>
              </div>
            )}
          </div>

          {/* MENU PLANNING */}
          <div>
            <button
              onClick={() => setOpenSubmenu(openSubmenu === 'planning' ? '' : 'planning')}
              className="w-full flex justify-between items-center p-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">📅 Planning</span>
              <span>{openSubmenu === 'planning' ? '▲' : '▼'}</span>
            </button>
            {openSubmenu === 'planning' && (
              <div className="ml-4 pl-3 border-l-2 border-emerald-200 space-y-1 mt-1">
                <button
                  onClick={() => navigateTo('planning-week')}
                  className={`w-full text-left p-2 text-sm rounded-lg ${
                    currentView === 'planning-week'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🗓️ Planning de la semaine
                </button>
              </div>
            )}
          </div>

          {/* MENU COURSES */}
          <div>
            <button
              onClick={() => setOpenSubmenu(openSubmenu === 'shopping' ? '' : 'shopping')}
              className="w-full flex justify-between items-center p-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">🛒 Panier & Courses</span>
              <span>{openSubmenu === 'shopping' ? '▲' : '▼'}</span>
            </button>
            {openSubmenu === 'shopping' && (
              <div className="ml-4 pl-3 border-l-2 border-emerald-200 space-y-1 mt-1">
                <button
                  onClick={() => navigateTo('shopping-list')}
                  className={`w-full text-left p-2 text-sm rounded-lg ${
                    currentView === 'shopping-list'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📝 Liste de courses
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* VUE : LISTE DES RECETTES */}
        {currentView === 'recipes-list' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Catalogue de Recettes</h2>
              <button
                onClick={() => {
                  resetForm();
                  navigateTo('recipes-add');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-3 py-2 rounded-xl shadow transition"
              >
                + Nouvelle
              </button>
            </div>

            {/* Filtres par catégories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-center text-slate-500 py-8">Chargement des recettes...</p>
            ) : filteredRecipes.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-100">
                <p className="text-slate-500">Aucune recette dans cette catégorie.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full mb-1">
                          {recipe.category || 'Plat'}
                        </span>
                        <h3 className="font-bold text-slate-800 text-lg">{recipe.title}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(recipe)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteRecipe(recipe.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Ingrédients
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.ingredients &&
                          recipe.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg"
                            >
                              {ing.name} <span className="font-bold">({ing.quantity})</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VUE : AJOUT / ÉDITION RECETTE */}
        {currentView === 'recipes-add' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                {editingRecipeId ? 'Éditer la recette' : 'Créer une recette'}
              </h2>
              <button
                onClick={() => navigateTo('recipes-list')}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Retour
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Nom du plat
                </label>
                <input
                  type="text"
                  placeholder="ex: Tarama maison"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== 'Toutes').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                  Ingrédients
                </label>
                <div className="space-y-2">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Ingrédient"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                        className="flex-1 p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qté"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                        className="w-20 p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientField(index)}
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addIngredientField}
                  className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
                >
                  + Ajouter un ingrédient
                </button>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow transition"
                >
                  {editingRecipeId ? 'Mettre à jour' : 'Enregistrer la recette'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VUE : PLANNING */}
        {currentView === 'planning-week' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Planning de la semaine</h2>
            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-emerald-700 text-sm uppercase tracking-wide border-b pb-2 mb-3">
                    {day}
                  </h3>
                  <div className="space-y-2">
                    {MEALS.map((meal) => {
                      const currentRecipeId = planning[`${day}-${meal}`] || '';
                      return (
                        <div key={meal} className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-500 w-20">{meal}</span>
                          <select
                            value={currentRecipeId}
                            onChange={(e) => handleMealSelect(day, meal, e.target.value)}
                            className="flex-1 p-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="">-- Libres / Reste --</option>
                            {recipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.title} ({r.category || 'Plat'})
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
          </div>
        )}

        {/* VUE : LISTE DE COURSES */}
        {currentView === 'shopping-list' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">🛒 Liste de courses</h2>
            {getShoppingList().length === 0 ? (
              <p className="text-slate-400 text-sm py-4">
                Aucun repas planifié pour le moment. Sélectionnez des recettes dans le planning !
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {getShoppingList().map((item, index) => (
                  <li key={index} className="py-3 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-emerald-600 rounded-md focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-slate-700 capitalize font-medium">{item.name}</span>
                    </label>
                    <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full">
                      x {item.quantity}
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