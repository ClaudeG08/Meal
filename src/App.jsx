import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import AuthModal from './components/AuthModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const PEXELS_API_KEY = process.env.REACT_APP_PEXELS_API_KEY || 'XSzr1kGcMyAW5qhPBzp9RQwilhRk52anVz7Kvu1gyWKiYeqUY9u1YRa4';
const RECIPE_IMAGES_BUCKET = 'recipe-images';

const MAIN_CATEGORIES = [
  { name: 'Plats', image: '/plats.png', bg: 'bg-[#E8F1E8]' },
  { name: 'Viandes et poissons', image: '/viandes_poissons.png', bg: 'bg-[#FDEBE6]' },
  { name: 'Accompagnements', image: '/accompagnements.png', bg: 'bg-[#FAF3DC]' },
  { name: 'Entrées', image: '/entrees.png', bg: 'bg-[#E8F3EB]' },
  { name: 'Desserts', image: '/desserts.png', bg: 'bg-[#F4EAF4]' },
  { name: 'Boissons', image: '/icons/drink.png', bg: 'bg-[#E6F4F8]' },
{ name: 'Petit dej', image: '/icons/croissant.png', bg: 'bg-[#FFF3E0]' },
{ name: 'Autres', image: '/icons/pain.png', bg: 'bg-[#F0F0F0]]' },


];

const SUB_CATEGORIES = {
  'Plats': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Tartes & Quiches', image: '/icons/tartes.png' },
    { name: 'Pâtes & Lasagnes', image: '/icons/pates.png' },
    { name: 'Mijotés', image: '/icons/mijotes.png' },
    { name: 'Autres', image: '/icons/autre.png' },
  ],
  'Viandes et poissons': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Viande', image: '/icons/viande.png' },
    { name: 'Poisson', image: '/icons/poisson.png' },
    { name: 'Volaille', image: '/icons/volaille.png' },
    { name: 'Oeufs', image: '/icons/egg.png' },
  ],
  'Accompagnements': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Légumes', image: '/icons/legumes.png' },
    { name: 'Féculents', image: '/icons/feculents.png' },
  ],
  'Entrées': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Entrées', image: '/icons/starter.png' },
    { name: 'Apéritifs', image: '/icons/nachos.png' },
  ],
  'Desserts': [
    { name: 'Tous', image: '/icons/tous.png' },
  ],
  'Boissons': [
    { name: 'Tous', image: '/icons/tous.png' },
    { name: 'Alcools', image: '/icons/alcool.png' },
    { name: 'Chauds', image: '/icons/hot.png' },
    { name: 'Autre', image: '/icons/other_drink.png' },
  ],
'Petit dej': [
    { name: 'Tous', image: '/icons/tous.png' },
  ],
'Autres': [
    { name: 'Tous', image: '/icons/tous.png' },
  ],
};

const UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'cl', label: 'cl' },
  { value: 'l', label: 'L' },
  { value: 'c. à soupe', label: 'c. à soupe' },
  { value: 'c. à café', label: 'c. à café' },
  { value: 'pièce(s)', label: 'pièce(s)' },
  { value: 'pincée(s)', label: 'pincée(s)' },
  { value: 'gousse(s)', label: 'gousse(s)' },
  { value: 'sachet(s)', label: 'sachet(s)' },
  { value: 'tranche(s)', label: 'tranche(s)' },
  { value: 'boîte(s)', label: 'boîte(s)' },
];

const getDefaultImage = (category) => {
  const cat = MAIN_CATEGORIES.find((c) => c.name === category);
  return cat ? cat.image : '/plats.png';
};

const uploadRecipeImage = async (file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error } = await supabase.storage
    .from(RECIPE_IMAGES_BUCKET)
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
};

// --- FIXATION REQUÊTE PEXELS ---
const searchRecipeImages = async (query) => {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + ' recette')}&per_page=6`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur API Pexels (${response.status})`);
    }

    const data = await response.json();
    return (data.photos || []).map((p) => ({
      id: p.id,
      thumb: p.src.small,
      full: p.src.large,
    }));
  } catch (err) {
    console.error("Détail erreur Pexels :", err);
    throw err;
  }
};

export default function App() {
  // --- ÉTATS D'AUTHENTIFICATION & MENU DÉROULANT ---
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState('welcome');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileView, setProfileView] = useState('recipes'); // 'recipes', 'profile', 'home'
  const menuRef = useRef(null);

  // --- ÉTATS FOYER (HOME) ---
  const [userHome, setUserHome] = useState(null);
  const [newHomeName, setNewHomeName] = useState('');
  const [homeCode, setHomeCode] = useState('');

  // --- ÉTATS DE NAVIGATION ---
  const [activeTab, setActiveTab] = useState('recipes');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // --- ÉTATS RECETTES ---
  const [recipes, setRecipes] = useState([]);
  const [selectedMainCat, setSelectedMainCat] = useState('Plats');
  const [selectedSubCat, setSelectedSubCat] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [recipeDetailTab, setRecipeDetailTab] = useState('ingredients');

  // --- ÉTATS PROFIL ---
  const [newPassword, setNewPassword] = useState('');

  // --- ÉTATS CRÉATION / ÉDITION ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Plats');
  const [formSubCategory, setFormSubCategory] = useState('Tartes & Quiches');
  const [formServings, setFormServings] = useState(4);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIngredients, setFormIngredients] = useState([{ name: '', quantity: '', unit: 'g' }]);
  const [formInstructions, setFormInstructions] = useState('');

  // --- ÉTATS SÉLECTEUR D'IMAGE ---
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState([]);
  const [imageSearchError, setImageSearchError] = useState('');

  // --- ÉTATS SELECTION NOMBRE DE PERSONNES ---
  const [selectedGuests, setSelectedGuests] = useState(4);

  // --- ÉTATS PLANNING & AGENDA ---
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().split('T')[0];
  });

  const [plannedMeals, setPlannedMeals] = useState([]);
  const [agenda, setAgenda] = useState({});
  const [planningSubTab, setPlanningSubTab] = useState('meals');

  // --- ÉTATS LISTE DE COURSES ---
  const [shoppingList, setShoppingList] = useState([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');
  const [newIngredientUnit, setNewIngredientUnit] = useState('g');

// --- ÉTATS D'ASSOCIATION D'ACCOMPAGNEMENT ---
const [showSideModal, setShowSideModal] = useState(false);
const [pendingMainRecipe, setPendingMainRecipe] = useState(null);
const [selectedSideRecipeId, setSelectedSideRecipeId] = useState('');

  // --- FERMER LE MENU AU CLIC EXTÉRIEUR ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- AUTHENTIFICATION & CHARGEMENT INITIAL ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setShowAuthModal(true);
      } else {
        fetchUserHome(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        fetchUserHome(session.user.id);
      } else {
        setUserHome(null);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setAuthModalView('reset_password');
        setShowAuthModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- RÉCUPÉRATION DU HOME DE L'UTILISATEUR ---
  const fetchUserHome = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('home_id, homes(*)')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Erreur chargement profil/home :", error);
        return;
      }

      if (profile?.homes) {
        setUserHome(profile.homes);
      } else {
        setUserHome(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

 // --- CRÉATION DE FOYER ---
const handleCreateHome = async () => {
  // VERIFICATION : Un seul foyer à la fois
  if (userHome) {
    alert("Vous appartenez déjà à un foyer. Veuillez le quitter avant d'en créer un nouveau.");
    return;
  }
  if (!newHomeName.trim()) {
    alert("Veuillez saisir un nom pour votre foyer.");
    return;
  }
  if (!user) return;

  const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: home, error: homeError } = await supabase
    .from('homes')
    .insert([{ name: newHomeName.trim(), invite_code: generatedCode }])
    .select()
    .single();

  if (homeError) {
    alert(`Erreur de création : ${homeError.message}`);
    return;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, home_id: home.id });

  if (profileError) {
    alert(`Erreur d'association du foyer : ${profileError.message}`);
    return;
  }

  setUserHome(home);
  setNewHomeName('');
  alert(`Foyer "${home.name}" créé avec succès ! Code : ${home.invite_code}`);
};

// --- REJOINDRre UN FOYER ---
const handleJoinHome = async () => {
  // VERIFICATION : Un seul foyer à la fois
  if (userHome) {
    alert("Vous appartenez déjà à un foyer. Veuillez le quitter avant d'en rejoindre un autre.");
    return;
  }
  if (!homeCode.trim()) {
    alert("Veuillez saisir un code de foyer.");
    return;
  }
  if (!user) return;

  const { data: home, error: homeError } = await supabase
    .from('homes')
    .select('*')
    .eq('invite_code', homeCode.trim().toUpperCase())
    .single();

  if (homeError || !home) {
    alert("Code de foyer invalide ou introuvable.");
    return;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, home_id: home.id });

  if (profileError) {
    alert(`Erreur d'association au foyer : ${profileError.message}`);
    return;
  }

  setUserHome(home);
  setHomeCode('');
  alert(`Vous avez rejoint le foyer "${home.name}" !`);
};

// --- QUITTER LE FOYER ---
const handleLeaveHome = async () => {
  if (!window.confirm("Voulez-vous vraiment quitter votre foyer actuel ?")) return;
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ home_id: null })
    .eq('id', user.id);

  if (error) {
    alert(`Erreur lors du départ du foyer : ${error.message}`);
    return;
  }

  setUserHome(null);
  alert("Vous avez quitté le foyer.");
};

  // --- RÉCUPÉRATION & SYNCHRONISATION EN TEMPS RÉEL ---
  useEffect(() => {
    fetchRecipes();
    fetchPlannedMeals();
    fetchShoppingList();

    const mealsChannel = supabase
      .channel('public:planned_meals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planned_meals' }, () => {
        fetchPlannedMeals();
      })
      .subscribe();

    const shoppingChannel = supabase
      .channel('public:shopping_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
        fetchShoppingList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(shoppingChannel);
    };
  }, [user, userHome]);

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recipes').select('*').order('id', { ascending: false });
    if (data) setRecipes(data);
  };

  const fetchPlannedMeals = async () => {
    let query = supabase.from('planned_meals').select('*');
    if (userHome) {
      query = query.eq('home_id', userHome.id);
    } else if (user) {
      query = query.eq('user_id', user.id);
    } else {
      setPlannedMeals([]);
      setAgenda({});
      return;
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erreur chargement repas planifiés :', error);
      return;
    }

    if (data) {
      const mapped = data.map((item) => ({
        id: item.id,
        recipeId: item.recipe_id,
        recipeTitle: item.recipe_title,
        baseServings: item.base_servings || 4,
        ingredients: item.ingredients || [],
        guests: item.guests || 4,
        assignedDay: item.assigned_day,
        assignedSlot: item.assigned_slot,
      }));
      setPlannedMeals(mapped);

      const newAgenda = {};
      mapped.forEach((m) => {
        if (m.assignedDay && m.assignedSlot) {
          newAgenda[`${m.assignedDay}-${m.assignedSlot}`] = m.id;
        }
      });
      setAgenda(newAgenda);
    }
  };

  const fetchShoppingList = async () => {
    let query = supabase.from('shopping_list').select('*').order('id', { ascending: true });
    if (userHome) {
      query = query.eq('home_id', userHome.id);
    } else if (user) {
      query = query.eq('user_id', user.id);
    } else {
      setShoppingList([]);
      return;
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erreur chargement liste de courses :', error);
      return;
    }
    if (data) setShoppingList(data);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setProfileView('recipes');
    await supabase.auth.signOut();
    setIsGuest(false);
    setUserHome(null);
    setAuthModalView('welcome');
    setShowAuthModal(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert(`Erreur : ${error.message}`);
    } else {
      alert('Mot de passe mis à jour avec succès !');
      setNewPassword('');
    }
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setShowAuthModal(false);
    if (activeTab !== 'recipes') {
      setActiveTab('recipes');
    }
  };

  useEffect(() => {
    if (activeRecipe) {
      setSelectedGuests(activeRecipe.servings || 4);
    }
  }, [activeRecipe]);

  // --- COURSES ---
// --- EXPORT PDF DE LA LISTE DE COURSES ---
const exportShoppingListToPDF = () => {
  try {
    if (shoppingList.length === 0) {
      alert("Votre liste de courses est vide !");
      return;
    }

    const doc = new jsPDF();

    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(44, 74, 52); // Couleur #2C4A34
    doc.text("Gil'Meal - Liste de courses", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Généré le ${dateStr}${userHome ? ` • Foyer : ${userHome.name}` : ''}`, 14, 27);

    // Préparation des données de la table
    const tableRows = shoppingList.map((item, index) => [
      index + 1,
      item.checked ? '[X]' : '[ ]',
      item.name.charAt(0).toUpperCase() + item.name.slice(1),
      item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '-',
    ]);

    // Génération de la table via la fonction autoTable
    autoTable(doc, {
      startY: 32,
      head: [['#', 'Statut', 'Article', 'Quantité']],
      body: tableRows,
      headStyles: {
        fillColor: [61, 102, 71], // Couleur #3D6647
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 247, 242], // Couleur #FAF7F2
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    // Sauvegarde du fichier
   
const fileName = `liste-de-courses-${new Date().toISOString().slice(0, 10)}.pdf`;

if (Capacitor.isNativePlatform()) {
  // --- CODE POUR ANDROID / IOS ---
  const pdfBase64 = doc.output('datauristring').split(',')[1];

  // 1. Sauvegarde du fichier dans le dossier de l'application
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: pdfBase64,
    directory: Directory.Cache
  });

  // 2. Ouverture de la fenêtre de partage native d'Android
  await Share.share({
    title: 'Liste de courses',
    url: savedFile.uri,
    dialogTitle: 'Partager ou enregistrer le PDF'
  });
} else {
  // --- CODE POUR NAVIGATEUR WEB ---
  doc.save(fileName);
}
alert("La liste de courses a été téléchargée avec succès !");

  } catch (error) {
    console.error("Erreur lors de la génération du PDF :", error);
    alert("Une erreur est survenue lors de l'exportation du PDF.");
  }
};
  const generateShoppingListFromPlanning = async () => {
    const totals = {};
    plannedMeals.forEach((meal) => {
      const baseServings = meal.baseServings || 4;
      const ratio = meal.guests / baseServings;
      (meal.ingredients || []).forEach((ing) => {
        const unit = ing.unit || 'g';
        const key = `${ing.name.toLowerCase().trim()}_${unit}`;
        const qty = (Number(ing.quantity) || 0) * ratio;
        if (totals[key]) {
          totals[key].quantity += qty;
        } else {
          totals[key] = {
            name: ing.name,
            quantity: qty,
            unit: unit,
            checked: false,
            home_id: userHome?.id || null,
            user_id: user?.id || null,
          };
        }
      });
    });

    const newItems = Object.values(totals);

    if (userHome) {
      await supabase.from('shopping_list').delete().eq('home_id', userHome.id);
    } else {
      await supabase.from('shopping_list').delete().eq('user_id', user.id);
    }

    if (newItems.length > 0) {
      const { error } = await supabase.from('shopping_list').insert(newItems);
      if (error) console.error("Erreur réinitialisation courses :", error);
    }
    fetchShoppingList();
  };

  const addCustomShoppingItem = async (e) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;

    const newItem = {
      name: newIngredientName.trim(),
      quantity: Number(newIngredientQty) || 0,
      unit: newIngredientUnit,
      checked: false,
      home_id: userHome?.id || null,
      user_id: user?.id || null,
    };

    const { error } = await supabase.from('shopping_list').insert([newItem]);
    if (error) {
      alert(`Erreur ajout article : ${error.message}`);
      return;
    }

    setNewIngredientName('');
    setNewIngredientQty('');
    setNewIngredientUnit('g');
    fetchShoppingList();
  };

  const toggleShoppingItem = async (id, currentChecked) => {
    setShoppingList(shoppingList.map((item) => (item.id === id ? { ...item, checked: !currentChecked } : item)));
    await supabase.from('shopping_list').update({ checked: !currentChecked }).eq('id', id);
  };

  const updateShoppingItem = async (id, field, value) => {
    setShoppingList(shoppingList.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    await supabase.from('shopping_list').update({ [field]: value }).eq('id', id);
  };

  const removeShoppingItem = async (id) => {
    setShoppingList(shoppingList.filter((item) => item.id !== id));
    await supabase.from('shopping_list').delete().eq('id', id);
  };

  // --- AGENDA ---
  const generateDays = () => {
    const daysList = [];
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return daysList;
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);

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
    if (isGuest || !user) {
      alert("En mode invité, vous ne pouvez pas créer de recette. Veuillez vous connecter.");
      setAuthModalView('welcome');
      setShowAuthModal(true);
      return;
    }
    setEditingId(null);
    setFormTitle('');
    setFormCategory('Plats');
    const firstSub = SUB_CATEGORIES['Plats']?.[0]?.name || 'Tous';
    setFormSubCategory(firstSub);
    setFormServings(4);
    setFormImageUrl('');
    setFormIngredients([{ name: '', quantity: '', unit: 'g' }]);
    setFormInstructions('');
    setImageSearchResults([]);
    setImageSearchError('');
    setIsFormOpen(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setImageSearchError('');
    try {
      const publicUrl = await uploadRecipeImage(file);
      setFormImageUrl(publicUrl);
      setImageSearchResults([]);
    } catch (err) {
      console.error("Erreur lors de l'upload de l'image :", err);
      setImageSearchError(`Échec de l'envoi de la photo : ${err.message}`);
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSearchImages = async () => {
    if (!formTitle.trim()) {
      setImageSearchError("Renseignez d'abord le titre de la recette.");
      return;
    }
    setIsSearchingImages(true);
    setImageSearchError('');
    try {
      const results = await searchRecipeImages(formTitle.trim());
      if (results.length === 0) {
        setImageSearchError('Aucune image trouvée pour ce titre.');
      }
      setImageSearchResults(results);
    } catch (err) {
      console.error('Erreur lors de la recherche d\'image :', err);
      setImageSearchError(`Impossible de récupérer les images. Vérifiez votre clé API.`);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const selectSearchedImage = (url) => {
    setFormImageUrl(url);
    setImageSearchResults([]);
  };

  const openEditForm = (recipe) => {
    const creatorId = recipe.created_by || recipe.user_id;
    if (isGuest || !user || user.id !== creatorId) {
      alert("Seul le créateur de la recette peut la modifier.");
      return;
    }
    setEditingId(recipe.id);
    setFormTitle(recipe.title);
    setFormCategory(recipe.category || 'Plats');
    setFormSubCategory(recipe.sub_category || recipe.subCategory || 'Tous');
    setFormServings(recipe.servings || 4);
    setFormImageUrl(recipe.image_url || '');
    setFormIngredients(
      recipe.ingredients?.length > 0
        ? JSON.parse(JSON.stringify(recipe.ingredients))
        : [{ name: '', quantity: '', unit: 'g' }]
    );
    setFormInstructions(recipe.instructions || '');
    setImageSearchResults([]);
    setImageSearchError('');
    setIsFormOpen(true);
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...formIngredients];
    updated[index][field] = value;
    setFormIngredients(updated);
  };

  const addIngredientField = () => {
    setFormIngredients([...formIngredients, { name: '', quantity: '', unit: 'g' }]);
  };

  const removeIngredientField = (index) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const filteredIngs = formIngredients.filter((ing) => ing.name.trim() !== '');
    const userDisplayName = user?.user_metadata?.username || user?.email?.split('@')[0] || user?.id || 'Inconnu';

    const recipeData = {
      title: formTitle,
      category: formCategory,
      sub_category: formSubCategory,
      servings: Number(formServings) || 4,
      ingredients: filteredIngs,
      instructions: formInstructions,
      image_url: formImageUrl.trim() ? formImageUrl.trim() : null,
      created_by: user?.id,
      creator_name: userDisplayName,
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

  const deleteRecipe = async (recipe) => {
    const creatorId = recipe.created_by || recipe.user_id;
    if (isGuest || !user || user.id !== creatorId) {
      alert("Seul le créateur de la recette peut la supprimer.");
      return;
    }
    if (!window.confirm('Voulez-vous vraiment supprimer cette recette ?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
    if (!error) {
      setRecipes(recipes.filter((r) => r.id !== recipe.id));
      setActiveRecipe(null);
    }
  };

  const toggleFavorite = async (recipeId, currentStatus, e) => {
    e.stopPropagation();
    if (isGuest || !user) {
      alert("Veuillez vous connecter pour gérer vos favoris.");
      setAuthModalView('welcome');
      setShowAuthModal(true);
      return;
    }
    const newStatus = !currentStatus;

    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, is_favorite: newStatus } : r))
    );

    const { error } = await supabase
      .from('recipes')
      .update({ is_favorite: newStatus })
      .eq('id', recipeId);

    if (error) {
      console.error("Erreur lors de la mise à jour du favori :", error);
    }
  };

  // --- FILTRAGE DE RECETTES ---
  const filteredRecipes = recipes.filter((r) => {
    const matchMain = (r.category || 'Plats') === selectedMainCat;
    const recipeSubCat = r.sub_category || r.subCategory;
    const matchSub = selectedSubCat === 'Tous' || recipeSubCat === selectedSubCat;
    
    const query = searchQuery.toLowerCase();
    const matchTitle = r.title.toLowerCase().includes(query);
    const matchCreator = (r.creator_name || '').toLowerCase().includes(query) || (r.created_by || '').toLowerCase().includes(query);
    const matchSearch = matchTitle || matchCreator;

    const matchesFavorite = showFavoritesOnly ? r.is_favorite : true;
    return matchMain && matchSub && matchSearch && matchesFavorite;
  });

  // --- NAV TABS ---
  const handleTabChange = (tab) => {
    if ((isGuest || !user) && (tab === 'planning' || tab === 'shopping' || (tab === 'recipes' && showFavoritesOnly))) {
      alert("Cet onglet est verrouillé. Veuillez vous connecter pour y accéder.");
      setAuthModalView('welcome');
      setShowAuthModal(true);
      return;
    }
    setProfileView('recipes');
    if (tab === 'recipes') {
      setShowFavoritesOnly(false);
    }
    setActiveTab(tab);
  };

  // --- GESTION PLANNING / AGENDA ---
const addRecipeToPlanning = async (recipe, sideRecipe = null) => {
  if (isGuest || !user) {
    alert("Veuillez vous connecter pour ajouter des repas au panier/planning.");
    setAuthModalView('welcome');
    setShowAuthModal(true);
    return;
  }

  // Si c'est Viandes et poissons et qu'aucun accompagnement n'a été spécifié/choisi
  if (recipe.category === 'Viandes et poissons' && !sideRecipe && sideRecipe !== false) {
    setPendingMainRecipe(recipe);
    setSelectedSideRecipeId('');
    setShowSideModal(true);
    return;
  }

  // On prépare les données du plat principal
  let combinedTitle = recipe.title;
  let combinedIngredients = [...(recipe.ingredients || [])];

  // Si un accompagnement est lié
  if (sideRecipe) {
    combinedTitle += ` + ${sideRecipe.title}`;
    
    // Adaptation du ratio d'ingrédients de l'accompagnement si les portions diffèrent
    const sideBaseServings = sideRecipe.servings || 4;
    const recipeBaseServings = recipe.servings || 4;
    
    const adaptedSideIngredients = (sideRecipe.ingredients || []).map(ing => ({
      ...ing,
      quantity: ((Number(ing.quantity) || 0) * (recipeBaseServings / sideBaseServings)).toString()
    }));

    combinedIngredients = [...combinedIngredients, ...adaptedSideIngredients];
  }

  const payload = {
    recipe_id: recipe.id,
    recipe_title: combinedTitle,
    base_servings: recipe.servings || 4,
    guests: selectedGuests,
    ingredients: combinedIngredients,
    assigned_day: null,
    assigned_slot: null,
    home_id: userHome?.id || null,
    user_id: user?.id || null,
  };

  const { data, error } = await supabase.from('planned_meals').insert([payload]).select();
  if (error) {
    alert(`Erreur lors de l'ajout au planning : ${error.message}`);
    return;
  }

  if (data && data.length > 0) {
    const newMeal = {
      id: data[0].id,
      recipeId: data[0].recipe_id,
      recipeTitle: data[0].recipe_title,
      baseServings: data[0].base_servings || 4,
      ingredients: data[0].ingredients || [],
      guests: data[0].guests || 4,
      assignedDay: data[0].assigned_day,
      assignedSlot: data[0].assigned_slot,
    };
    setPlannedMeals((prev) => [...prev, newMeal]);
  }

  setShowSideModal(false);
  setPendingMainRecipe(null);
  alert(`"${combinedTitle}" a été ajouté au panier !`);
};

const handleConfirmSideChoice = () => {
  if (!pendingMainRecipe) return;

  const sideRecipe = recipes.find((r) => r.id === Number(selectedSideRecipeId));
  // Si sideRecipe est undefined, il sera ajouté seul sans accompagnement
  addRecipeToPlanning(pendingMainRecipe, sideRecipe || false);
};
  const removePlannedMeal = async (id) => {
    await supabase.from('planned_meals').delete().eq('id', id);
    fetchPlannedMeals();
  };

  const updateGuests = async (id, delta) => {
    const meal = plannedMeals.find((m) => m.id === id);
    if (!meal) return;
    const newGuests = Math.max(1, meal.guests + delta);

    setPlannedMeals(plannedMeals.map((m) => (m.id === id ? { ...m, guests: newGuests } : m)));
    await supabase.from('planned_meals').update({ guests: newGuests }).eq('id', id);
  };

  const assignMealToAgenda = async (dayId, slot, mealId) => {
    const parsedMealId = mealId ? Number(mealId) : null;

    if (parsedMealId) {
      await supabase
        .from('planned_meals')
        .update({ assigned_day: dayId, assigned_slot: slot })
        .eq('id', parsedMealId);
    } else {
      const currentKey = `${dayId}-${slot}`;
      const currentMealId = agenda[currentKey];
      if (currentMealId) {
        await supabase
          .from('planned_meals')
          .update({ assigned_day: null, assigned_slot: null })
          .eq('id', currentMealId);
      }
    }

    fetchPlannedMeals();
  };

  const handleRandomAgendaFill = async () => {
    if (recipes.length === 0) {
      alert("Vous devez avoir au moins une recette enregistrée pour remplir l'agenda.");
      return;
    }

    if (
      plannedMeals.length > 0 &&
      !window.confirm("Cela va remplacer les affectations actuelles de votre agenda. Voulez-vous continuer ?")
    ) {
      return;
    }

    if (userHome) {
      await supabase.from('planned_meals').delete().eq('home_id', userHome.id);
    } else {
      await supabase.from('planned_meals').delete().eq('user_id', user.id);
    }

    const newPlannedMeals = [];
    days.forEach((day) => {
      ['M', 'S'].forEach((slot) => {
        const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
        newPlannedMeals.push({
          recipe_id: randomRecipe.id,
          recipe_title: randomRecipe.title,
          base_servings: randomRecipe.servings || 4,
          guests: randomRecipe.servings || 4,
          ingredients: randomRecipe.ingredients || [],
          assigned_day: day.id,
          assigned_slot: slot,
          home_id: userHome?.id || null,
          user_id: user?.id || null,
        });
      });
    });

    const { error } = await supabase.from('planned_meals').insert(newPlannedMeals);
    if (error) {
      alert(`Erreur remplissage : ${error.message}`);
    } else {
      fetchPlannedMeals();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800 flex flex-col font-sans relative pb-28">

      {/* MODALE D'AUTHENTIFICATION */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialView={authModalView}
        onGuestLogin={handleGuestLogin}
      />

      {/* EN-TÊTE AVEC BOUTON PERSONNAGE ET MENU PROFIL/HOME */}
      <header className="bg-white/80 backdrop-blur-md rounded-b-[32px] px-6 py-4 shadow-sm flex justify-between items-center max-w-2xl mx-auto w-full sticky top-0 z-30">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setProfileView('recipes');
            setActiveTab('recipes');
            setActiveRecipe(null);
            setShowFavoritesOnly(false);
          }}
        >
          <img
            src="/logo.png"
            alt="GILMEAL Logo"
            className="h-16 w-auto object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-extrabold text-xl text-[#2C4A34] tracking-wider">
            Gil'Meal
          </span>
        </div>

        {/* MENU DÉROULANT EN HAUT À DROITE */}
        <div className="relative" ref={menuRef}>
          {user ? (
            <div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 rounded-full bg-[#E8F3EB] text-[#2C4A34] border border-[#3D6647]/20 flex items-center justify-center hover:bg-[#3D6647] hover:text-white transition shadow-sm"
                title="Mon Compte"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Connecté en tant que</p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {user.user_metadata?.username || user.email}
                    </p>
                    {userHome && (
                      <p className="text-[10px] text-[#3D6647] font-extrabold truncate mt-0.5">
                        🏠 {userHome.name}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setProfileView('profile');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#FAF7F2] hover:text-[#2C4A34] flex items-center gap-2 transition"
                  >
                    <span>👤</span> Profil
                  </button>

                  <button
                    onClick={() => {
                      setProfileView('home');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#FAF7F2] hover:text-[#2C4A34] flex items-center gap-2 transition"
                  >
                    <span>🏠</span> Home
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-[#EF6A45] hover:bg-red-50 flex items-center gap-2 transition"
                  >
                    <span>🚪</span> Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : isGuest ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Mode Invité</span>
              <button
                onClick={() => {
                  setAuthModalView('welcome');
                  setShowAuthModal(true);
                }}
                className="bg-[#3D6647] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#2f5037] transition"
              >
                Se connecter
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-5 overflow-x-hidden">

        {/* VUE PROFIL */}
        {profileView === 'profile' && user && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                <span>👤</span> Profil Utilisateur
              </h2>
              <button
                onClick={() => setProfileView('recipes')}
                className="text-xs font-extrabold text-[#3D6647] hover:underline"
              >
                ← Retour
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">Identifiant :</span>
                  <span className="font-extrabold text-slate-800">
                    {user.user_metadata?.username || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500">Email :</span>
                  <span className="font-extrabold text-slate-800">{user.email}</span>
                </div>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase">
                  Changer le mot de passe
                </h3>
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6647]"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-[#3D6647] hover:bg-[#2f5037] text-white font-extrabold py-3 rounded-2xl text-xs transition"
                >
                  Mettre à jour le mot de passe
                </button>
              </form>
            </div>
          </div>
        )}

{/* MODALE SELECTION D'ACCOMPAGNEMENT */}
{showSideModal && pendingMainRecipe && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-100">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="font-extrabold text-slate-800 text-base">
          🥗 Choisir un accompagnement
        </h3>
        <button
          onClick={() => {
            setShowSideModal(false);
            setPendingMainRecipe(null);
          }}
          className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center hover:bg-slate-200"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-slate-600 font-medium">
        Vous avez sélectionné <strong className="text-slate-800">{pendingMainRecipe.title}</strong>. 
        Voulez-vous lui associer un accompagnement pour composer un repas complet ?
      </p>

      <div>
        <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
          Accompagnements disponibles
        </label>
        <select
          value={selectedSideRecipeId}
          onChange={(e) => setSelectedSideRecipeId(e.target.value)}
          className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6647]"
        >
          <option value="">-- Aucun (Ajouter seul) --</option>
          {recipes
            .filter((r) => r.category === 'Accompagnements')
            .map((side) => (
              <option key={side.id} value={side.id}>
                {side.title}
              </option>
            ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleConfirmSideChoice}
          className="flex-1 bg-[#3D6647] hover:bg-[#2f5037] text-white font-extrabold py-3 rounded-2xl text-xs transition"
        >
          Valider le repas
        </button>
        <button
          onClick={() => {
            setShowSideModal(false);
            setPendingMainRecipe(null);
          }}
          className="bg-slate-100 text-slate-600 font-extrabold py-3 px-4 rounded-2xl text-xs hover:bg-slate-200 transition"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}

       {/* VUE HOME (FOYER PARTICIPATIF) */}
{profileView === 'home' && user && (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
    <div className="flex justify-between items-center border-b pb-3">
      <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
        <span>🏠</span> Gestion du Foyer
      </h2>
      <button
        onClick={() => setProfileView('recipes')}
        className="text-xs font-extrabold text-[#3D6647] hover:underline"
      >
        ← Retour
      </button>
    </div>

    {userHome ? (
      /* --- SI L'UTILISATEUR A UN FOYER : AFFICHER INFOS + BOUTON QUITTER --- */
      <div className="space-y-4">
        <div className="bg-[#E8F3EB] p-5 rounded-2xl border border-[#3D6647]/30 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-[#2C4A34]">Votre Foyer Actif</h3>
            <span className="bg-[#3D6647] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              Actif
            </span>
          </div>
          <p className="text-lg font-black text-slate-800">{userHome.name}</p>
          <div className="bg-white/80 p-3 rounded-xl border border-[#3D6647]/20 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Code d'invitation</p>
              <p className="text-base font-black text-[#2C4A34] tracking-widest">{userHome.invite_code}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(userHome.invite_code);
                alert("Code copié dans le presse-papier !");
              }}
              className="text-xs bg-[#3D6647] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-[#2C4A34]"
            >
              Copier
            </button>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Partagez ce code avec les membres de votre famille pour synchroniser vos listes.
          </p>
        </div>

        {/* BOUTON POUR QUITTER LE FOYER */}
        <button
          onClick={handleLeaveHome}
          className="w-full bg-red-50 hover:bg-red-100 text-[#EF6A45] font-extrabold py-3 rounded-2xl text-xs border border-red-200 transition flex items-center justify-center gap-2"
        >
          <span>🚪</span> Quitter ce foyer
        </button>
      </div>
    ) : (
      /* --- SI L'UTILISATEUR N'A PAS DE FOYER : AFFICHER LES FORMULAIRES --- */
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Vous n'appartenez à aucun foyer pour le moment. Créez-en un ou rejoignez-en un grâce à un code.
        </p>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-200 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase">Créer un nouveau foyer</h3>
          <input
            type="text"
            placeholder="Nom du foyer (ex: Maison, Coloc...)"
            value={newHomeName}
            onChange={(e) => setNewHomeName(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6647]"
          />
          <button
            onClick={handleCreateHome}
            className="w-full bg-[#2C4A34] text-white font-extrabold py-3 rounded-2xl text-xs hover:bg-[#1f3525] transition"
          >
            + Créer mon Home
          </button>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-200 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase">Rejoindre un foyer existant</h3>
          <input
            type="text"
            placeholder="Entrer le code du Home..."
            value={homeCode}
            onChange={(e) => setHomeCode(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6647]"
          />
          <button
            onClick={handleJoinHome}
            className="w-full bg-[#EF6A45] hover:bg-[#d95a37] text-white font-extrabold py-3 rounded-2xl text-xs transition"
          >
            Rejoindre
          </button>
        </div>
      </div>
    )}
  </div>
)}

        {/* SECTION RECETTES */}
        {profileView === 'recipes' && activeTab === 'recipes' && !activeRecipe && (
          <div className="space-y-5">
            {/* BANNIÈRE */}
            <div className="max-w-2xl mx-auto w-full px-4 pt-4">
              <div className="relative rounded-[32px] overflow-hidden bg-[#FAF7F2] min-h-[160px] flex items-center p-6 shadow-sm border border-slate-100/50">
                <div
                  className="absolute inset-0 bg-cover bg-right bg-no-repeat pointer-events-none"
                  style={{ backgroundImage: "url('/banner.png')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/90 to-transparent w-3/4"></div>

                <div className="relative z-10 max-w-[260px] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-handwriting text-3xl text-[#3D6647] font-bold">
                      Bonjour !
                    </span>
                  </div>
                  <h1 className="text-xl font-extrabold text-slate-800 leading-snug">
                    Qu'est-ce qu'on cuisine aujourd'hui ?
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
                          className="w-6 h-6 object-contain shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* BARRE DE RECHERCHE + BOUTON NOUVELLE RECETTE */}
            <div className="flex gap-2.5 items-center">
              <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm flex items-center gap-2 border border-slate-100">
                <span className="text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher un plat ou un créateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-semibold focus:outline-none bg-transparent placeholder:text-slate-400"
                />
              </div>

              {!isGuest && user && (
                <button
                  onClick={openCreateForm}
                  className="bg-[#EF6A45] hover:bg-[#d95a37] active:scale-95 text-white px-4 py-3 rounded-2xl shadow-sm text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
                >
                  <span className="text-base leading-none">+</span> Ajouter
                </button>
              )}
            </div>

            {/* LISTE DES RECETTES */}
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
                    className="relative bg-white p-3 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-[#3D6647] hover:shadow-md transition gap-3"
                  >
                    <img
                      src={r.image_url || getDefaultImage(r.category)}
                      alt={r.title}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0 bg-slate-100"
                      onError={(e) => {
                        e.target.src = getDefaultImage(r.category);
                      }}
                    />

                    <div className="space-y-1 flex-1">
                      <span className="font-extrabold text-slate-800 text-sm block pr-2">{r.title}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <span className="bg-[#FAF3DC] text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {r.sub_category || r.subCategory || r.category}
                        </span>
                        <span>•</span>
                        <span>👥 {r.servings || 4} p.</span>
                        {r.creator_name && (
                          <>
                            <span>•</span>
                            <span className="text-[#3D6647] font-semibold text-[10px]">
                              Par @{r.creator_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isGuest && (
                        <button
                          onClick={(e) => toggleFavorite(r.id, r.is_favorite, e)}
                          className="w-8 h-8 rounded-full bg-white/80 border border-slate-100 flex items-center justify-center shadow-sm text-red-500 hover:scale-110 active:scale-95 transition"
                        >
                          <svg
                            className="w-5 h-5"
                            fill={r.is_favorite ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                            />
                          </svg>
                        </button>
                      )}
                      <span className="w-8 h-8 rounded-full bg-[#E8F3EB] text-[#3D6647] flex items-center justify-center font-bold text-sm shrink-0">
                        ➔
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VUE DÉTAIL RECETTE */}
        {profileView === 'recipes' && activeTab === 'recipes' && activeRecipe && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setActiveRecipe(null)}
                className="text-xs font-extrabold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                ⬅ Retour aux recettes
              </button>

              {user && (activeRecipe.created_by === user.id || activeRecipe.user_id === user.id) && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openEditForm(activeRecipe)}
                    className="text-xs text-[#3D6647] font-bold hover:underline"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => deleteRecipe(activeRecipe)}
                    className="text-xs text-[#EF6A45] font-bold hover:underline"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              )}
            </div>

            <div className="w-full h-52 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm flex items-center justify-center">
              <img
                src={activeRecipe.image_url || getDefaultImage(activeRecipe.category)}
                alt={activeRecipe.title}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  e.target.src = getDefaultImage(activeRecipe.category);
                }}
              />
            </div>

            <div>
              <span className="bg-[#FDF2E9] text-[#EF6A45] text-[10px] font-extrabold px-3 py-1 rounded-full inline-block mb-2">
                ★ {activeRecipe.category}
              </span>
              <h2 className="text-2xl font-black text-slate-800">{activeRecipe.title}</h2>
              
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400 font-medium">
                  Recette créée pour <strong className="text-slate-700">{activeRecipe.servings || 4} pers.</strong>
                </p>
                {activeRecipe.creator_name && (
                  <p className="text-xs text-[#3D6647] font-bold">
                    Créée par @{activeRecipe.creator_name}
                  </p>
                )}
              </div>
            </div>

            {/* SELECTION NOMBRE DE PERSONNES */}
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

                {!isGuest && (
                  <button
                    onClick={() => addRecipeToPlanning(activeRecipe)}
                    className="bg-[#EF6A45] hover:bg-[#d95a37] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
                  >
                    + Ajouter à la liste
                  </button>
                )}
              </div>
            </div>

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
                  const formattedQty = calculatedQty ? Math.round(calculatedQty * 10) / 10 : ing.quantity;

                  return (
                    <li key={i} className="flex justify-between items-center text-xs border-b border-slate-50 py-2 font-medium">
                      <span className="text-slate-700">{ing.name}</span>
                      <span className="font-extrabold text-[#3D6647] bg-[#E8F3EB] px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>{formattedQty}</span>
                        {ing.unit && <span className="text-[10px] text-[#3D6647] lowercase">{ing.unit}</span>}
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

        {/* MODALE FORMULAIRE DE CRÉATION / MODIFICATION */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl border border-slate-100">
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

                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                    Photo de la recette
                  </label>

                  {formImageUrl && (
                    <div className="relative mb-2">
                      <img
                        src={formImageUrl}
                        alt="Aperçu"
                        className="w-full h-40 object-cover rounded-2xl border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs font-bold flex items-center justify-center"
                        title="Retirer la photo"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer text-center bg-[#E8F3EB] text-[#3D6647] text-xs font-extrabold px-3 py-2.5 rounded-2xl hover:bg-[#dcecdf] transition">
                      {isUploadingImage ? 'Envoi...' : '📷 Depuis l\'appareil'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleSearchImages}
                      disabled={isSearchingImages}
                      className="bg-[#FAF3DC] text-[#8a6d1f] text-xs font-extrabold px-3 py-2.5 rounded-2xl hover:bg-[#f5ecc9] transition disabled:opacity-60"
                    >
                      {isSearchingImages ? 'Recherche...' : '🔍 Chercher une image'}
                    </button>
                  </div>

                  {imageSearchError && (
                    <p className="text-[10px] font-bold text-[#EF6A45] mt-1.5">{imageSearchError}</p>
                  )}

                  {imageSearchResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {imageSearchResults.map((img) => (
                        <button
                          type="button"
                          key={img.id}
                          onClick={() => selectSearchedImage(img.full)}
                          className="rounded-xl overflow-hidden border-2 border-transparent hover:border-[#3D6647] transition"
                        >
                          <img src={img.thumb} alt="Suggestion" className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  <details className="mt-2">
                    <summary className="text-[10px] font-extrabold text-slate-400 uppercase cursor-pointer">
                      Ou coller un lien d'image
                    </summary>
                    <input
                      type="url"
                      placeholder="https://domaine.com/photo.jpg"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full p-3 mt-1.5 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#3D6647]"
                    />
                  </details>
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
                    <div key={i} className="flex gap-1.5 items-center mb-2">
                      <input
                        type="text"
                        placeholder="Ingrédient"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                        className="flex-1 min-w-0 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                      <input
                        type="number"
                        placeholder="Qté"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(i, 'quantity', e.target.value)}
                        className="w-14 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold shrink-0"
                      />
                      <select
                        value={ing.unit || 'g'}
                        onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
                        className="w-20 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none shrink-0"
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                      {formIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredientField(i)}
                          className="text-[#EF6A45] font-bold p-1 text-sm shrink-0"
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
                    rows="4"
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    className="w-full p-3 bg-[#FAF7F2] border border-slate-200 rounded-2xl text-xs font-medium min-h-[120px]"
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
        {profileView === 'recipes' && activeTab === 'planning' && !isGuest && user && (
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
                Agenda
              </button>
            </div>

            {planningSubTab === 'meals' && (
              <div className="space-y-3">
                {plannedMeals.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm space-y-2">
                    <span className="text-3xl">🛒</span>
                    <p className="text-slate-500 font-semibold text-sm">
                      Aucun repas sélectionné. Allez dans "Recettes" et cliquez sur "+ Ajouter à la liste".
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
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-slate-700 uppercase whitespace-nowrap">
                      📅 Début :
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-[#FAF7F2] border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none w-1/2"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-slate-700 uppercase whitespace-nowrap">
                      🏁 Fin :
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[#FAF7F2] border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none w-1/2"
                    />
                  </div>

                  <button
                    onClick={handleRandomAgendaFill}
                    className="w-full bg-[#EF6A45] hover:bg-[#d95a37] active:scale-95 text-white text-xs font-extrabold px-4 py-2.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition mt-1"
                  >
                    <span>🎲</span>
                    <span>Remplir automatiquement ({days.length}j)</span>
                  </button>
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
        {profileView === 'recipes' && activeTab === 'shopping' && !isGuest && user && (
          <div className="space-y-4">
            <div className="bg-white p-3 sm:p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
             <div className="flex items-center justify-between gap-2 flex-wrap">
  <h2 className="text-xl font-extrabold text-slate-800">🛒 Ma liste</h2>
  <div className="flex items-center gap-2">
    <button
      onClick={exportShoppingListToPDF}
      className="bg-[#EF6A45] hover:bg-[#d95a37] text-white transition font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm flex items-center gap-1.5"
      title="Télécharger la liste au format PDF"
    >
      📄 Exporter en PDF
    </button>
    <button
      onClick={generateShoppingListFromPlanning}
      className="bg-[#E8F3EB] text-[#3D6647] hover:bg-[#3D6647] hover:text-white transition font-extrabold text-xs px-3 py-2 rounded-xl border border-[#3D6647]/20 flex items-center gap-1.5"
      title="Générer d'après votre planning de repas"
    >
      🔄 Importer
    </button>
  </div>
</div>

              <form onSubmit={addCustomShoppingItem} className="flex gap-1.5 items-center pt-2">
                <input
                  type="text"
                  placeholder="Ajouter un article (ex: Pain, Lait...)"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  className="flex-1 min-w-0 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3D6647]"
                />
                <input
                  type="number"
                  placeholder="Qté"
                  value={newIngredientQty}
                  onChange={(e) => setNewIngredientQty(e.target.value)}
                  className="w-12 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none shrink-0"
                />
                <select
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  className="w-18 p-2 bg-[#FAF7F2] border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none shrink-0"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-[#3D6647] text-white p-2 rounded-xl font-extrabold text-xs hover:bg-[#2C4A34] transition shrink-0"
                >
                  +
                </button>
              </form>

              {shoppingList.length === 0 ? (
                <p className="text-slate-400 text-xs font-semibold text-center py-4">
                  Aucun article dans la liste. Cliquez sur "Importer liste repas" ou ajoutez un élément ci-dessus.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {shoppingList.map((item) => (
                    <li key={item.id} className="py-2.5 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleShoppingItem(item.id, item.checked)}
                          className="w-4 h-4 text-[#3D6647] rounded-md focus:ring-[#3D6647] border-slate-300 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateShoppingItem(item.id, 'name', e.target.value)}
                          className={`text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#3D6647] focus:outline-none flex-1 min-w-0 capitalize ${
                            item.checked ? 'line-through text-slate-400' : 'text-slate-700'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateShoppingItem(item.id, 'quantity', Number(e.target.value))}
                          className="w-12 p-1 text-center bg-[#FAF7F2] border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateShoppingItem(item.id, 'unit', e.target.value)}
                          className="p-1 bg-[#FAF7F2] border border-slate-200 rounded-lg text-[10px] font-semibold focus:outline-none max-w-[70px]"
                        >
                          {UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeShoppingItem(item.id)}
                          className="p-1 text-[#EF6A45] hover:bg-red-50 rounded-lg transition text-xs font-bold"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      </main>

      {/* BARRE DE NAVIGATION FLOTTANTE */}
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex gap-6 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-xl border border-slate-100 items-center">
          
          <button
            onClick={() => {
              if (isGuest || !user) {
                alert("L'accès aux favoris nécessite un compte. Veuillez vous connecter.");
                setAuthModalView('welcome');
                setShowAuthModal(true);
                return;
              }
              setProfileView('recipes');
              if (activeTab !== 'recipes') {
                setActiveTab('recipes');
                setActiveRecipe(null);
                setShowFavoritesOnly(true);
              } else {
                setShowFavoritesOnly(!showFavoritesOnly);
              }
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-extrabold transition ${
              showFavoritesOnly && activeTab === 'recipes' && profileView === 'recipes' ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center text-lg rounded-full transition relative ${
              showFavoritesOnly && activeTab === 'recipes' && profileView === 'recipes' ? 'bg-red-50 text-red-500' : ''
            }`}>
              <svg
                className="w-5 h-5"
                fill={showFavoritesOnly && activeTab === 'recipes' && profileView === 'recipes' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {isGuest && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
            </div>
            <span>Mes favoris</span>
          </button>

          <button
            onClick={() => handleTabChange('recipes')}
            className={`flex flex-col items-center gap-0.5 text-xs font-extrabold transition ${
              activeTab === 'recipes' && !showFavoritesOnly && profileView === 'recipes' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center text-lg rounded-full transition ${activeTab === 'recipes' && !showFavoritesOnly && profileView === 'recipes' ? 'bg-[#E8F3EB]' : ''}`}>
              📖
            </div>
            <span>Recettes</span>
          </button>

          <button
            onClick={() => handleTabChange('planning')}
            className={`flex flex-col items-center gap-0.5 text-xs font-extrabold transition ${
              activeTab === 'planning' && profileView === 'recipes' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center text-lg rounded-full transition relative ${activeTab === 'planning' && profileView === 'recipes' ? 'bg-[#E8F3EB]' : ''}`}>
              📅
              {isGuest && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
            </div>
            <span>Mes repas</span>
          </button>

          <button
            onClick={() => handleTabChange('shopping')}
            className={`flex flex-col items-center gap-0.5 text-xs font-extrabold transition ${
              activeTab === 'shopping' && profileView === 'recipes' ? 'text-[#3D6647]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`w-9 h-9 flex items-center justify-center text-lg rounded-full transition relative ${activeTab === 'shopping' && profileView === 'recipes' ? 'bg-[#E8F3EB]' : ''}`}>
              🛒
              {isGuest && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
            </div>
            <span>Mes courses</span>
          </button>

        </nav>
      </div>

    </div>
  );
}