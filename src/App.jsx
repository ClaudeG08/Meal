import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const MAIN_CATEGORIES = [
  { name: 'Plats', image: '/plats.png', bg: 'bg-[#E8F1E8]' },
  { name: 'Viandes et poissons', image: '/viandes_poissons.png', bg: 'bg-[#FDEBE6]' },
  { name: 'Accompagnements', image: '/accompagnements.png', bg: 'bg-[#FAF3DC]' },
  { name: 'Entrées', image: '/entrees.png', bg: 'bg-[#E8F3EB]' },
  { name: 'Desserts', image: '/desserts.png', bg: 'bg-[#F4EAF4]' },
];

const SUB_CATEGORIES = {
  'Plats': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Tartes & Quiches', image: '/icons/tartes.png' },
    { name: 'Pâtes & Lasagnes', image: '/icons/pates.png' },
    { name: 'Mijotés', image: '/icons/mijotes.png' },
  ],
  'Viandes et poissons': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Viande', image: '/icons/viande.png' },
    { name: 'Poisson', image: '/icons/poisson.png' },
    { name: 'Volaille', image: '/icons/volaille.png' },
  ],
  'Accompagnements': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Légumes', image: '/icons/legumes.png' },
    { name: 'Féculents', image: '/icons/feculents.png' },
  ],
  'Entrées': [
    { name: 'Tous', image: '/icons/tous.png' },
  ],
  'Desserts': [
    { name: 'Tous', image: '/icons/tous.png' },
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
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800 flex flex-col font-sans relative pb-28">

     {/* 1. EN-TÊTE BLANC ET ARRONDI (STYLE MAQUETTE) */}
<header className="bg-white/80 backdrop-blur-md rounded-b-[32px] px-6 py-4 shadow-sm flex justify-between items-center max-w-2xl mx-auto w-full sticky top-0 z-30">
  {/* Menu Hamburger */}
  <button className="p-2 text-[#2C4A34] hover:bg-slate-100 rounded-full transition">
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  {/* Logo Centré + Nom GILMEAL */}
  <div 
    className="flex items-center gap-2 cursor-pointer"
    onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}
  >
    <img 
      src="/logo.png" 
      alt="GILMEAL Logo" 
      className="h-9 w-auto object-contain"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
    <span className="font-extrabold text-xl text-[#2C4A34] tracking-wider uppercase">
      GILMEAL
    </span>
  </div>

  {/* Bouton Profil avec pastille orange */}
  <button className="p-2 border border-slate-200 rounded-full text-slate-700 hover:bg-slate-50 transition relative">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
    <span className="absolute top-0 right-0 w-3 h-3 bg-[#EF6A45] rounded-full border-2 border-white"></span>
  </button>
</header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5">

        {/* SECTION RECETTES */}
        {activeTab === 'recipes' && !activeRecipe && (
          <div className="space-y-5">
            {/* SALUTATION */}
           <div className="max-w-2xl mx-auto w-full px-4 pt-4">
  <div className="relative rounded-[32px] overflow-hidden bg-[#FAF7F2] min-h-[160px] flex items-center p-6 shadow-sm border border-slate-100/50">
    
    {/* Image de fond positionnée sur la droite */}
    <div 
      className="absolute inset-0 bg-cover bg-right bg-no-repeat pointer-events-none"
      style={{ backgroundImage: "url('/banner.png')" }} 
    />

    {/* Dégradé léger à gauche pour garantir la lisibilité du texte */}
    <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/90 to-transparent w-3/4"></div>

    {/* Contenu Texte */}
    <div className="relative z-10 max-w-[260px] space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-handwriting text-3xl text-[#3D6647] font-bold">
          Bonjour !
        </span>
        <span className="text-[#EF6A45] font-extrabold text-lg"></span>
      </div>
      <h1 className="text-xl font-extrabold text-slate-800 leading-snug">
        Qu'est-ce qu'on cuisine aujourd'hui ? <span className="text-[#EF6A45] inline-block ml-0.5"></span>
      </h1>
    </div>

  </div>
</div>

          {/* FILTRE CATÉGORIES PRINCIPALES */}
<div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
  {MAIN_CATEGORIES.map((cat) => {
    const isSelected = selectedMainCat === cat.name;
    return (
      <button
        key={cat.name}
        onClick={() => {
          setSelectedMainCat(cat.name);
          setSelectedSubCat('Tous');
        }}
        className={`${cat.bg} min-w-[88px] w-22 aspect-square p-2.5 rounded-2xl flex flex-col items-center justify-between text-center transition-all transform active:scale-95 shadow-sm border-2 shrink-0 ${
          isSelected ? 'border-[#3D6647]' : 'border-transparent'
        }`}
      >
        <div className="w-full flex-1 flex items-center justify-center">
          <img
            src={cat.image}
            alt={cat.name}
            className="w-10 h-10 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <span className="text-[10px] font-bold text-slate-700 leading-tight break-words hyphens-auto w-full line-clamp-2">
          {cat.name}
        </span>
      </button>
    );
  })}
</div>

            {/* FILTRE SOUS-CATÉGORIES */}
            {SUB_CATEGORIES[selectedMainCat] && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {SUB_CATEGORIES[selectedMainCat].map((sub) => {
                  const isSelected = selectedSubCat === sub.name;
                  return (
                    <button
                      key={sub.name}
                      onClick={() => setSelectedSubCat(sub.name)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shadow-sm ${
                        isSelected
                          ? 'bg-[#2C4A34] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
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

            {/* BARRE DE RECHERCHE + BOUTON NOUVELLE RECETTE ORANGE */}
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
              <button
                onClick={openCreateForm}
                className="bg-[#EF6A45] hover:bg-[#d95a37] active:scale-95 text-white px-4 py-3 rounded-2xl shadow-sm text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
              >
                <span className="text-base leading-none">+</span> Ajouter
              </button>
            </div>

            {/* LISTE DES RECETTES (CARTES CHALEUREUSES) */}
            <div className="grid gap-3 pt-1">
              {filteredRecipes.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm space-y-2">
                  <span className="text-3xl">🍲</span>
                  <p className="text-slate-500 font-semibold text-sm">Aucune recette trouvée.</p>
                </div>
              ) : (
                filteredRecipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveRecipe(r)}
                    className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-[#3D6647] hover:shadow-md transition"
                  >
                    <div className="space-y-1">
                      <span className="font-extrabold text-slate-800 text-base block">{r.title}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <span className="bg-[#FAF3DC] text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {r.subCategory || r.category}
                        </span>
                        <span>•</span>
                        <span>👥 Portion : {r.servings || 4} pers.</span>
                      </div>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-[#E8F3EB] text-[#3D6647] flex items-center justify-center font-bold text-sm shrink-0">
                      ➔
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* DÉTAIL RECETTE */}
        {activeTab === 'recipes' && activeRecipe && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveRecipe(null)}
                className="text-xs font-extrabold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                ⬅ Retour aux recettes
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => openEditForm(activeRecipe)}
                  className="text-xs text-[#3D6647] font-bold hover:underline"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => deleteRecipe(activeRecipe.id)}
                  className="text-xs text-[#EF6A45] font-bold hover:underline"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>

            <div>
              <span className="bg-[#FDF2E9] text-[#EF6A45] text-[10px] font-extrabold px-3 py-1 rounded-full inline-block mb-2">
                ★ {activeRecipe.category}
              </span>
              <h2 className="text-2xl font-black text-slate-800">{activeRecipe.title}</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Recette créée pour <strong className="text-slate-700">{activeRecipe.servings || 4} pers.</strong>
              </p>
            </div>

            {/* SELECTION DU NOMBRE DE PERSONNES ET AJOUT PANIER */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <span className="text-xs font-bold text-slate-700">
                Ajuster les portions :
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setSelectedGuests(Math.max(1, selectedGuests - 1))}
                    className="w-7 h-7 bg-[#E8F3EB] text-[#3D6647] rounded-lg font-bold text-xs hover:bg-[#3D6647] hover:text-white transition"
                  >
                    -
                  </button>
                  <span className="text-xs font-extrabold text-slate-800 px-2">
                    {selectedGuests} pers.
                  </span>
                  <button
                    onClick={() => setSelectedGuests(selectedGuests + 1)}
                    className="w-7 h-7 bg-[#E8F3EB] text-[#3D6647] rounded-lg font-bold text-xs hover:bg-[#3D6647] hover:text-white transition"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => addRecipeToPlanning(activeRecipe)}
                  className="bg-[#EF6A45] hover:bg-[#d95a37] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  + Ajouter au panier
                </button>
              </div>
            </div>

            {/* ONGLET INGRÉDIENTS / ÉTAPES */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setRecipeDetailTab('ingredients')}
                className={`flex-1 py-2.5 text-xs font-extrabold border-b-2 transition ${
                  recipeDetailTab === 'ingredients'
                    ? 'border-[#3D6647] text-[#3D6647]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Ingrédients ({selectedGuests} pers.)
              </button>
              <button
                onClick={() => setRecipeDetailTab('instructions')}
                className={`flex-1 py-2.5 text-xs font-extrabold border-b-2 transition ${
                  recipeDetailTab === 'instructions'
                    ? 'border-[#3D6647] text-[#3D6647]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
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
                    <li key={i} className="flex justify-between text-xs border-b border-slate-50 py-2 font-medium">
                      <span className="text-slate-700">{ing.name}</span>
                      <span className="font-extrabold text-[#3D6647] bg-[#E8F3EB] px-2.5 py-0.5 rounded-full">
                        {calculatedQty ? Math.round(calculatedQty * 10) / 10 : ing.quantity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-medium">
                {activeRecipe.instructions || 'Aucune étape renseignée pour cette recette.'}
              </p>
            )}
          </div>
        )}

        {/* MODALE FORMULAIRE */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl border border-slate-100">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-slate-800 text-lg">
                  {editingId ? '✏️ Modifier la recette' : '📖 Créer une recette'}
                </h3>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRecipe} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">Titre</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6647]"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Catégorie</label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setFormCategory(newCat);
                        const firstSub = SUB_CATEGORIES[newCat]?.[0]?.name || 'Tous';
                        setFormSubCategory(firstSub);
                      }}
                      className="w-full p-2.5 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {MAIN_CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Sous-Cat.</label>
                    <select
                      value={formSubCategory}
                      onChange={(e) => setFormSubCategory(e.target.value)}
                      className="w-full p-2.5 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {SUB_CATEGORIES[formCategory]?.map((sc) => (
                        <option key={sc.name} value={sc.name}>{sc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Base Pers.</label>
                    <input
                      type="number"
                      min="1"
                      value={formServings}
                      onChange={(e) => setFormServings(e.target.value)}
                      className="w-full p-2.5 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                    Ingrédients (Quantité pour {formServings} pers.)
                  </label>
                  {formIngredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Ingrédient"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                        className="flex-1 p-2.5 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                      <input
                        type="number"
                        placeholder="Qté"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(i, 'quantity', e.target.value)}
                        className="w-20 p-2.5 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                      {formIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientField(i)}
                          className="text-[#EF6A45] font-bold px-2 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addIngredientField}
                    className="text-xs font-extrabold text-[#3D6647] hover:underline"
                  >
                    + Ajouter un ingrédient
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                    Étapes de préparation
                  </label>
                  <textarea
                    rows="3"
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-medium"
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#3D6647] hover:bg-[#2f5037] text-white font-extrabold py-3 rounded-2xl text-xs transition"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="bg-slate-100 text-slate-600 font-extrabold py-3 px-5 rounded-2xl text-xs hover:bg-slate-200 transition"
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
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button
                onClick={() => setPlanningSubTab('meals')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition ${
                  planningSubTab === 'meals' ? 'bg-[#3D6647] text-white shadow' : 'text-slate-500'
                }`}
              >
                Liste des repas
              </button>
              <button
                onClick={() => setPlanningSubTab('agenda')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition ${
                  planningSubTab === 'agenda' ? 'bg-[#3D6647] text-white shadow' : 'text-slate-500'
                }`}
              >
                Agenda (3 semaines)
              </button>
            </div>

            {planningSubTab === 'meals' && (
              <div className="space-y-3">
                {plannedMeals.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm space-y-2">
                    <span className="text-3xl">🛒</span>
                    <p className="text-slate-500 font-semibold text-sm">
                      Aucun repas sélectionné. Allez dans "Recettes" et cliquez sur "+ Ajouter au panier".
                    </p>
                  </div>
                ) : (
                  plannedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center gap-3"
                    >
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{meal.recipeTitle}</h4>
                        <span
                          className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full mt-1 ${
                            meal.assignedDay
                              ? 'bg-[#E8F3EB] text-[#3D6647]'
                              : 'bg-[#FDF2E9] text-[#EF6A45]'
                          }`}
                        >
                          {meal.assignedDay
                            ? `Affecté : ${days.find((d) => d.id === meal.assignedDay)?.label || meal.assignedDay} (${meal.assignedSlot === 'M' ? 'Midi' : 'Soir'})`
                            : 'Non affecté'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-slate-100">
                          <button
                            onClick={() => updateGuests(meal.id, -1)}
                            className="w-6 h-6 bg-white rounded-lg font-bold text-slate-600 text-xs shadow-sm"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-slate-700 px-1">{meal.guests} p</span>
                          <button
                            onClick={() => updateGuests(meal.id, 1)}
                            className="w-6 h-6 bg-white rounded-lg font-bold text-slate-600 text-xs shadow-sm"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removePlannedMeal(meal.id)}
                          title="Supprimer"
                          className="p-2 text-[#EF6A45] hover:bg-red-50 rounded-xl transition text-sm"
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
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 uppercase">
                    📅 Date de début :
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#FAF7F2] border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {days.map((day) => (
                    <div key={day.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                      <span className="font-extrabold text-xs text-[#3D6647] uppercase tracking-wider block">
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
                              className={`p-2.5 rounded-2xl border text-xs flex flex-col gap-1 transition ${
                                isAssigned
                                  ? 'bg-[#E8F3EB] border-[#3D6647]/30'
                                  : 'bg-[#FAF7F2] border-slate-100'
                              }`}
                            >
                              <span className="font-extrabold text-slate-500 text-[10px]">
                                {slot === 'M' ? 'Midi' : 'Soir'}
                              </span>

                              <select
                                value={currentMealId}
                                onChange={(e) => assignMealToAgenda(day.id, slot, e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-700 font-semibold focus:outline-none"
                              >
                                <option value="">-- Affecter --</option>
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
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-xl font-extrabold text-slate-800">🛒 Liste de courses finale</h2>
            {getShoppingList().length === 0 ? (
              <p className="text-slate-400 text-xs font-semibold">
                Aucun ingrédient dans le panier. Ajoutez des recettes au planning.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {getShoppingList().map((item, index) => (
                  <li key={index} className="py-3 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[#3D6647] rounded-md focus:ring-[#3D6647] border-slate-300"
                      />
                      <span className="text-slate-700 capitalize text-xs font-bold">{item.name}</span>
                    </label>
                    <span className="bg-[#E8F3EB] text-[#3D6647] font-extrabold text-xs px-3 py-1 rounded-full">
                      x {Math.round(item.quantity * 10) / 10}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </main>

      {/* BARRE DE NAVIGATION FLOTTANTE BOMBÉE */}
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex gap-6 bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full shadow-xl border border-slate-100 items-center">
          <button
            onClick={() => { setActiveTab('recipes'); setActiveRecipe(null); }}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-extrabold transition ${
              activeTab === 'recipes' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-full ${activeTab === 'recipes' ? 'bg-[#E8F3EB]' : ''}`}>
              📖
            </div>
            Recettes
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