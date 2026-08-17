import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEALS = ['Déjeuner', 'Dîner'];

export default function App() {
  const [activeTab, setActiveTab] = useState('recipes');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PLANNING (dans le localStorage pour l'instant) ---
  const [planning, setPlanning] = useState(() => {
    const saved = localStorage.getItem('meal_planner_planning');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('meal_planner_planning', JSON.stringify(planning));
  }, [planning]);

  // --- CHARGER LES RECETTES DEPUIS SUPABASE ---
  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Erreur lors du chargement :', error);
    } else {
      setRecipes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // --- FORMULAIRE D'AJOUT ---
  const [newTitle, setNewTitle] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);

  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const filteredIngredients = ingredients.filter((ing) => ing.name.trim() !== '');

    const { data, error } = await supabase
      .from('recipes')
      .insert([
        {
          title: newTitle,
          category: 'Plat',
          ingredients: filteredIngredients,
        },
      ])
      .select();

    if (error) {
      alert('Erreur lors de l\'ajout de la recette : ' + error.message);
    } else if (data) {
      setRecipes([data[0], ...recipes]);
      setNewTitle('');
      setIngredients([{ name: '', quantity: '' }]);
    }
  };

  // --- ÉDITION ---
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIngredients, setEditIngredients] = useState([]);

  const startEditing = (recipe) => {
    setEditingId(recipe.id);
    setEditTitle(recipe.title);
    setEditIngredients(JSON.parse(JSON.stringify(recipe.ingredients)));
  };

  const handleEditIngredientChange = (index, field, value) => {
    const updated = [...editIngredients];
    updated[index][field] = value;
    setEditIngredients(updated);
  };

  const addEditIngredientField = () => {
    setEditIngredients([...editIngredients, { name: '', quantity: '' }]);
  };

  const removeEditIngredientField = (index) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };

  const saveEdit = async (id) => {
    const filteredIngredients = editIngredients.filter((ing) => ing.name.trim() !== '');

    const { error } = await supabase
      .from('recipes')
      .update({
        title: editTitle,
        ingredients: filteredIngredients,
      })
      .eq('id', id);

    if (error) {
      alert('Erreur lors de la modification : ' + error.message);
    } else {
      setRecipes(
        recipes.map((r) =>
          r.id === id ? { ...r, title: editTitle, ingredients: filteredIngredients } : r
        )
      );
      setEditingId(null);
    }
  };

  // --- SUPPRESSION ---
  const deleteRecipe = async (id) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);

    if (error) {
      alert('Erreur lors de la suppression : ' + error.message);
    } else {
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

  // --- CALCUL PANIER DE COURSES ---
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

  const shoppingList = getShoppingList();

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col">
      <header className="bg-emerald-600 text-white p-4 shadow-md text-center font-bold text-xl">
        🥗 GILMEAL
      </header>

      {/* Navigation */}
      <nav className="flex justify-around bg-white border-b border-gray-200">
        {['planning', 'recipes', 'shopping'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 font-medium border-b-2 capitalize ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'planning' ? '📅 Planning' : tab === 'recipes' ? '📖 Recettes' : '🛒 Panier'}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {/* ONGLET RECETTES */}
        {activeTab === 'recipes' && (
          <div className="space-y-6">
            <form onSubmit={handleAddRecipe} className="bg-white p-4 rounded-xl shadow space-y-4">
              <h2 className="text-lg font-bold text-emerald-700">Ajouter une recette partagée</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom du plat</label>
                <input
                  type="text"
                  placeholder="ex: Risotto aux champignons"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingrédients</label>
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Ingrédient (ex: Riz)"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qté"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                      className="w-20 p-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredientField}
                  className="text-sm text-emerald-600 font-semibold hover:underline mt-1"
                >
                  + Ajouter un ingrédient
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition"
              >
                Enregistrer dans la base partagée
              </button>
            </form>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-700">Mes Recettes Partagées ({recipes.length})</h2>
              {loading ? (
                <p className="text-gray-500 text-sm">Chargement des recettes...</p>
              ) : recipes.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune recette trouvée. Ajoutez la première !</p>
              ) : (
                recipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white p-4 rounded-xl shadow border border-gray-100">
                    {editingId === recipe.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg font-bold"
                        />
                        <div className="space-y-2">
                          {editIngredients.map((ing, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={ing.name}
                                onChange={(e) => handleEditIngredientChange(i, 'name', e.target.value)}
                                className="flex-1 p-1 border rounded text-sm"
                              />
                              <input
                                type="number"
                                value={ing.quantity}
                                onChange={(e) => handleEditIngredientChange(i, 'quantity', e.target.value)}
                                className="w-20 p-1 border rounded text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => removeEditIngredientField(i)}
                                className="text-red-500 font-bold px-2 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addEditIngredientField}
                            className="text-xs text-emerald-600 font-semibold hover:underline"
                          >
                            + Ingrédient
                          </button>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => saveEdit(recipe.id)}
                            className="flex-1 bg-emerald-600 text-white py-1 px-3 rounded text-sm font-semibold"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-200 text-gray-700 py-1 px-3 rounded text-sm font-semibold"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-800 text-md">{recipe.title}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(recipe)}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => deleteRecipe(recipe.id)}
                              className="text-sm text-red-500 hover:underline"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                          {recipe.ingredients &&
                            recipe.ingredients.map((ing, i) => (
                              <li key={i}>
                                {ing.name} : <span className="font-semibold">{ing.quantity}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ONGLET PLANNING */}
        {activeTab === 'planning' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-700">Planning de la semaine</h2>
            {DAYS.map((day) => (
              <div key={day} className="bg-white p-4 rounded-xl shadow border border-gray-100">
                <h3 className="font-bold text-emerald-700 text-md border-b pb-2 mb-3">{day}</h3>
                <div className="space-y-2">
                  {MEALS.map((meal) => {
                    const currentRecipeId = planning[`${day}-${meal}`] || '';
                    return (
                      <div key={meal} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-600 w-24">{meal} :</span>
                        <select
                          value={currentRecipeId}
                          onChange={(e) => handleMealSelect(day, meal, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white"
                        >
                          <option value="">-- Aucun repas --</option>
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
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

        {/* ONGLET PANIER */}
        {activeTab === 'shopping' && (
          <div className="bg-white p-4 rounded-xl shadow space-y-4">
            <h2 className="text-lg font-bold text-emerald-700">🛒 Liste de courses</h2>
            {shoppingList.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Aucune recette sélectionnée dans le planning pour cette semaine.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {shoppingList.map((item, index) => (
                  <li key={index} className="py-2 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-gray-800">{item.name}</span>
                    </label>
                    <span className="font-bold text-emerald-700 text-sm">x {item.quantity}</span>
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