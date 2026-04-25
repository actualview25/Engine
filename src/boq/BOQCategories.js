// ============================================
// BOQ CATEGORIES - فئات بنود الكميات
// يحتوي على: الفئات، الوحدات، الأسعار الافتراضية
// ============================================

export const BOQCategories = {
    // أعمال الحفر
    excavation: {
        id: 'excavation',
        name: 'أعمال الحفر',
        icon: 'fa-hard-hat',
        color: '#d4a373',
        unit: 'm³',
        defaultRate: 45,
        items: [
            { name: 'حفر أساسات', unit: 'm³', rate: 45 },
            { name: 'حفر خنادق', unit: 'm³', rate: 40 },
            { name: 'تسوية الموقع', unit: 'm²', rate: 8 },
            { name: 'ردم حول الأساسات', unit: 'm³', rate: 30 },
            { name: 'نقل ناتج الحفر', unit: 'm³', rate: 25 }
        ]
    },
    
    // أعمال الخرسانة
    concrete: {
        id: 'concrete',
        name: 'أعمال الخرسانة',
        icon: 'fa-cube',
        color: '#888888',
        unit: 'm³',
        defaultRate: 350,
        items: [
            { name: 'خرسانة نظافة', unit: 'm³', rate: 280 },
            { name: 'خرسانة ميدات', unit: 'm³', rate: 350 },
            { name: 'خرسانة أعمدة', unit: 'm³', rate: 380 },
            { name: 'خرسانة جدران', unit: 'm³', rate: 360 },
            { name: 'خرسانة سقف', unit: 'm³', rate: 400 },
            { name: 'خرسانة عادية', unit: 'm³', rate: 320 },
            { name: 'خرسانة مسلحة', unit: 'm³', rate: 420 }
        ]
    },
    
    // أعمال الحدادة
    reinforcement: {
        id: 'reinforcement',
        name: 'أعمال الحدادة (حديد تسليح)',
        icon: 'fa-chart-line',
        color: '#c0c0c0',
        unit: 'ton',
        defaultRate: 3200,
        items: [
            { name: 'حديد قطر 8 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 10 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 12 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 14 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 16 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 18 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 20 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 22 مم', unit: 'ton', rate: 3200 },
            { name: 'حديد قطر 25 مم', unit: 'ton', rate: 3200 },
            { name: 'شبك حديد', unit: 'm²', rate: 25 }
        ]
    },
    
    // أعمال البناء (طوب)
    blockwork: {
        id: 'blockwork',
        name: 'أعمال البناء',
        icon: 'fa-border-all',
        color: '#c4a882',
        unit: 'm²',
        defaultRate: 120,
        items: [
            { name: 'طوب أحمر 20×20×40', unit: 'm²', rate: 110 },
            { name: 'طوب أحمر 10×20×40', unit: 'm²', rate: 100 },
            { name: 'بلوك خرساني 20×20×40', unit: 'm²', rate: 130 },
            { name: 'بلوك خرساني 15×20×40', unit: 'm²', rate: 120 },
            { name: 'جدران ستائر', unit: 'm²', rate: 150 }
        ]
    },
    
    // أعمال اللياسة
    plastering: {
        id: 'plastering',
        name: 'أعمال اللياسة',
        icon: 'fa-trowel',
        color: '#e8e0d0',
        unit: 'm²',
        defaultRate: 25,
        items: [
            { name: 'لياسة داخلية', unit: 'm²', rate: 22 },
            { name: 'لياسة خارجية', unit: 'm²', rate: 28 },
            { name: 'لياسة محارة عادية', unit: 'm²', rate: 20 },
            { name: 'لياسة سقف', unit: 'm²', rate: 25 }
        ]
    },
    
    // أعمال الدهان
    painting: {
        id: 'painting',
        name: 'أعمال الدهان',
        icon: 'fa-paint-roller',
        color: '#4a90d9',
        unit: 'm²',
        defaultRate: 15,
        items: [
            { name: 'دهان داخلي (طبقتين)', unit: 'm²', rate: 14 },
            { name: 'دهان خارجي', unit: 'm²', rate: 18 },
            { name: 'دهان أكريليك', unit: 'm²', rate: 16 },
            { name: 'دهان مطفي', unit: 'm²', rate: 12 },
            { name: 'دهان سقف', unit: 'm²', rate: 13 }
        ]
    },
    
    // أعمال البلاط
    tiling: {
        id: 'tiling',
        name: 'أعمال البلاط',
        icon: 'fa-th-large',
        color: '#aaccdd',
        unit: 'm²',
        defaultRate: 70,
        items: [
            { name: 'بلاط سيراميك 40×40', unit: 'm²', rate: 65 },
            { name: 'بلاط سيراميك 60×60', unit: 'm²', rate: 75 },
            { name: 'بلاط بورسلين', unit: 'm²', rate: 90 },
            { name: 'بلاط موزايكو', unit: 'm²', rate: 50 },
            { name: 'ركام رخام', unit: 'm²', rate: 120 }
        ]
    },
    
    // أعمال السباكة
    plumbing: {
        id: 'plumbing',
        name: 'أعمال السباكة',
        icon: 'fa-faucet',
        color: '#4aa4d9',
        unit: 'lot',
        defaultRate: 5000,
        items: [
            { name: 'مواسير مياه', unit: 'm', rate: 25 },
            { name: 'مواسير صرف', unit: 'm', rate: 30 },
            { name: 'خلاطات', unit: 'unit', rate: 150 },
            { name: 'غرف تفتيش', unit: 'unit', rate: 300 },
            { name: 'خزانات مياه', unit: 'unit', rate: 2000 }
        ]
    },
    
    // أعمال الكهرباء
    electrical: {
        id: 'electrical',
        name: 'أعمال الكهرباء',
        icon: 'fa-bolt',
        color: '#e8c24a',
        unit: 'lot',
        defaultRate: 4000,
        items: [
            { name: 'أسلاك كهربائية', unit: 'm', rate: 8 },
            { name: 'مواسير كهرباء', unit: 'm', rate: 12 },
            { name: 'مفاتيح كهرباء', unit: 'unit', rate: 15 },
            { name: 'مقابس كهرباء', unit: 'unit', rate: 15 },
            { name: 'لوحة توزيع رئيسية', unit: 'unit', rate: 800 },
            { name: 'عداد كهرباء', unit: 'unit', rate: 1200 }
        ]
    },
    
    // أعمال النجارة
    carpentry: {
        id: 'carpentry',
        name: 'أعمال النجارة',
        icon: 'fa-wood',
        color: '#d4a373',
        unit: 'm²',
        defaultRate: 200,
        items: [
            { name: 'أبواب خشبية', unit: 'unit', rate: 800 },
            { name: 'نوافذ خشبية', unit: 'unit', rate: 500 },
            { name: 'كاونتر خشب', unit: 'm', rate: 300 },
            { name: 'خزائن مطبخ', unit: 'm', rate: 600 },
            { name: 'ديكورات خشب', unit: 'm²', rate: 250 }
        ]
    },
    
    // أعمال الزجاج
    glass: {
        id: 'glass',
        name: 'أعمال الزجاج',
        icon: 'fa-square',
        color: '#88aacc',
        unit: 'm²',
        defaultRate: 120,
        items: [
            { name: 'زجاج سيكوريت', unit: 'm²', rate: 150 },
            { name: 'زجاج عادي', unit: 'm²', rate: 80 },
            { name: 'زجاج دبل جلاس', unit: 'm²', rate: 250 },
            { name: 'مرايا', unit: 'm²', rate: 120 }
        ]
    },
    
    // أعمال العزل
    insulation: {
        id: 'insulation',
        name: 'أعمال العزل',
        icon: 'fa-shield-alt',
        color: '#84a9c0',
        unit: 'm²',
        defaultRate: 35,
        items: [
            { name: 'عزل حراري سقف', unit: 'm²', rate: 40 },
            { name: 'عزل مائي', unit: 'm²', rate: 35 },
            { name: 'عزل حراري جدران', unit: 'm²', rate: 30 },
            { name: 'عزل صوتي', unit: 'm²', rate: 45 }
        ]
    },
    
    // أعمال التشطيبات النهائية
    finishes: {
        id: 'finishes',
        name: 'أعمال التشطيبات النهائية',
        icon: 'fa-sparkles',
        color: '#c4986c',
        unit: 'm²',
        defaultRate: 100,
        items: [
            { name: 'جبس عادي', unit: 'm²', rate: 40 },
            { name: 'جبس ديكور', unit: 'm²', rate: 80 },
            { name: 'جبس أسقف معلقة', unit: 'm²', rate: 120 },
            { name: 'لياسة ديكورية', unit: 'm²', rate: 60 }
        ]
    }
};

// الحصول على فئة بواسطة المعرف
export function getCategoryById(categoryId) {
    return BOQCategories[categoryId] || null;
}

// الحصول على جميع الفئات
export function getAllCategories() {
    return Object.values(BOQCategories);
}

// الحصول على أسعار القطع حسب الفئة
export function getItemsByCategory(categoryId) {
    const category = BOQCategories[categoryId];
    return category ? category.items : [];
}

// الحصول على السعر الافتراضي للقطعة
export function getDefaultRate(categoryId, itemName) {
    const category = BOQCategories[categoryId];
    if (!category) return 0;
    
    const item = category.items.find(i => i.name === itemName);
    return item ? item.rate : category.defaultRate;
}

// إضافة فئة جديدة
export function addCustomCategory(category) {
    BOQCategories[category.id] = category;
}

// إضافة قطعة جديدة لفئة موجودة
export function addCustomItem(categoryId, item) {
    const category = BOQCategories[categoryId];
    if (category) {
        category.items.push(item);
    }
}

// تحديث سعر قطعة
export function updateItemRate(categoryId, itemName, newRate) {
    const category = BOQCategories[categoryId];
    if (category) {
        const item = category.items.find(i => i.name === itemName);
        if (item) {
            item.rate = newRate;
        }
    }
}

// الحصول على وحدة قياس الفئة
export function getCategoryUnit(categoryId) {
    const category = BOQCategories[categoryId];
    return category ? category.unit : 'unit';
}

// الحصول على أيقونة الفئة
export function getCategoryIcon(categoryId) {
    const category = BOQCategories[categoryId];
    return category ? category.icon : 'fa-box';
}

// الحصول على لون الفئة
export function getCategoryColor(categoryId) {
    const category = BOQCategories[categoryId];
    return category ? category.color : '#888888';
}