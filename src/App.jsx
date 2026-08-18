import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const MAIN_CATEGORIES = [
  { name: 'Plats', image: '/plats.png' },
  { name: 'Viandes et poissons', image: '/viandes_poissons.png' },
  { name: 'Accompagnements', image: '/accompagnements.png' },
  { name: 'Entrées', image: '/entrees.png' },
  { name: 'Desserts', image: '/desserts.png' },
];

const SUB_CATEGORIES = {
  'Plats': [
    { name: 'Tous', image: '/tous.png' },
    { name: 'Tartes & Quiches', image: '/tartes.png' },
    { name: 'Pâtes & Lasagnes', image: '/pates.png' },
    { name: 'Mijotés', image: '/mijotes.png' },
  ],
  'Viandes et poissons': [
    { name: 'Tous', image: '/tous.png' },
    { name: 'Viande', image: '/viande.png' },
    { name: 'Poisson', image: '/poisson.png' },
    { name: 'Volaille', image: '/volaille.png' },
  ],
  'Accompagnements': [
    { name: 'Tous', image: '/tous.png' },
    { name: 'Légumes', image: '/legumes.png' },
    { name: 'Féculents', image: '/feculents.png' },
  ],
  'Entrées': [
    { name: 'Tous', image: '/tous.png' },
  ],
  'Desserts': [
    { name: 'Tous', image: '/tous.png' },
  ],
};

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
  const [formServings, setFormServings] = useState(4);
  const [formIngredients, setFormIngredients] = useState([{ name: '', quantity: '' }]);
  const [formInstructions, setFormInstructions] = useState('');

  // --- ÉTATS SELECTION NOMBRE DE PERSONNES ---
  const [selectedGuests, setSelectedGuests] = useState(4);

  // --- ÉTATS PLANNING & AGENDA 21 JOURS ---
  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem('agenda_start_date');
    return saved || new Date().toISOString().split('T')[0];
  });

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
    localStorage.setItem('agenda_start_date', startDate);
  }, [startDate]);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recipes').select('*').order('id', { ascending: false });
    if (data) setRecipes(data);
  };

  useEffect(() => {
    if (activeRecipe) {
      setSelectedGuests(activeRecipe.servings || 4);
    }
  }, [activeRecipe]);

  // --- GÉNÉRATION DES 21 JOURS ---
  const generateDays = () => {
    const daysList = [];
    const baseDate = startDate ? new Date(startDate) : new Date();

    for (let i = 0; i < 21; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + i);

      const dayKey = currentDate.toISOString().split('T')[0];
      const formattedLabel = currentDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });

      daysList.push({ id: dayKey, label: formattedLabel });
    }
    return daysList;
  };

  const days = generateDays();

  // --- FORMULAIRE RECETTE ---
  const openCreateForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormCategory('Plats');
    const firstSub = SUB_CATEGORIES['Plats']?.[0]?.name || 'Tous';
    setFormSubCategory(firstSub);
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

  const removePlannedMeal = (id) => {
    setPlannedMeals(plannedMeals.filter((m) => m.id !== id));
    
    const updatedAgenda = { ...agenda };
    Object.keys(updatedAgenda).forEach((key) => {
      if (updatedAgenda[key] === id) {
        delete updatedAgenda[key];
      }
    });
    setAgenda(updatedAgenda);
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
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans relative">
      {/* BANNIÈRE SUPÉRIEURE */}
      <header className="relative bg-emerald-800 bg-[url('/banner.jpg')] bg-cover bg-center text-white shadow-md h-20 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
        <div 
          className="relative flex items-center cursor-pointer" 
          onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}
        >
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-14 w-auto object-contain drop-shadow-md rounded-xl"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-24">
        {/* SECTION RECETTES */}
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

            {/* FILTRE CATÉGORIES PRINCIPALES */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {MAIN_CATEGORIES.map((cat) => {
                const isSelected = selectedMainCat === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedMainCat(cat.name);
                      setSelectedSubCat('Tous');
                    }}
                    className={`flex flex-col items-center justify-center min-w-[135px] p-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md scale-105'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-10 h-10 object-contain mb-1.5"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="text-center line-clamp-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>

        {/* FILTRE SOUS-CATÉGORIES AVEC IMAGES */}
{SUB_CATEGORIES[selectedMainCat] && (
  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
    {SUB_CATEGORIES[selectedMainCat].map((sub) => {
      const isSelected = selectedSubCat === sub.name;
      return (
        <button
          key={sub.name}
          onClick={() => setSelectedSubCat(sub.name)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold w-auto shrink-0 whitespace-nowrap transition-all ${
            isSelected
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {sub.image && (
            <img
              src={sub.image}
              alt={sub.name}
              className="w-4 h-4 object-contain shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span>{sub.name}</span>
        </button>
      );
    })}
  </div>
)}

            <input
              type="text"
              placeholder="🔍 Rechercher une recette..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

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

        {/* DÉTAIL RECETTE */}
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

        {/* MODALE FORMULAIRE */}
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
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Titre</label>
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
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Catégorie</label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setFormCategory(newCat);
                        const firstSub = SUB_CATEGORIES[newCat]?.[0]?.name || 'Tous';
                        setFormSubCategory(firstSub);
                      }}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {MAIN_CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sous-Cat.</label>
                    <select
                      value={formSubCategory}
                      onChange={(e) => setFormSubCategory(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {SUB_CATEGORIES[formCategory]?.map((sc) => (
                        <option key={sc.name} value={sc.name}>{sc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Base Pers.</label>
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
                    Étapes de préparation
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

        {/* SECTION PLANNING */}
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
                Agenda (3 semaines)
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
                            ? `Affecté : ${days.find((d) => d.id === meal.assignedDay)?.label || meal.assignedDay} (${meal.assignedSlot === 'M' ? 'Midi' : 'Soir'})`
                            : 'N/A : Non affecté'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
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

                        <button
                          onClick={() => removePlannedMeal(meal.id)}
                          title="Supprimer du panier"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {planningSubTab === 'agenda' && (
              <div className="space-y-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    📅 Date de début :
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-100 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {days.map((day) => (
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
              </div>
            )}
          </div>
        )}

        {/* SECTION PANIER / COURSES */}
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

      {/* BARRE DE NAVIGATION FLOTTANTE */}
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl">
          <button
            onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'recipes' 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            📖 Recettes
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'planning' 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            📅 Planning
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'shopping' 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🛒 Panier
          </button>
        </nav>
      </div>
    </div>
  );
}