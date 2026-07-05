// Default brands config
const DEFAULT_BRANDS = [
  {
    id: 'sammtech',
    name: 'SammTech',
    type: 'Agency & Marketing',
    sub: false,
    frequencyGoal: 2,
    logo: 'assets/logos/sammtech.png',
    grad: 'var(--grad-sammtech)',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.15)',
    lastPostDate: '2026-07-03'
  },
  {
    id: 'lovelife',
    name: 'Lovelife Memories',
    type: 'Photography & Cinematography',
    sub: false,
    frequencyGoal: 0,
    logo: 'assets/logos/lovelife.png',
    grad: 'var(--grad-lovelife)',
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.15)',
    lastPostDate: '2026-07-04'
  },
  {
    id: 'tahams',
    name: 'Tahams',
    type: 'Customized Clothing POD',
    sub: false,
    frequencyGoal: 14,
    logo: 'assets/logos/tahams.png',
    grad: 'var(--grad-tahams)',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
    lastPostDate: '2026-07-05'
  },
  {
    id: 'perfume-tahams',
    name: 'Perfume de Tahams',
    type: 'Tahams Subsection',
    sub: true,
    frequencyGoal: 2,
    logo: 'assets/logos/perfume-tahams.png',
    grad: 'var(--grad-perfume)',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.15)',
    lastPostDate: '2026-07-02'
  },
  {
    id: 'lumina-tahams',
    name: 'Lumina by Tahams',
    type: 'Tahams Subsection',
    sub: true,
    frequencyGoal: 1,
    logo: 'assets/logos/lumina-tahams.png',
    grad: 'var(--grad-lumina)',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.15)',
    lastPostDate: '2026-07-04'
  },
  {
    id: 'star-tahams',
    name: 'Tahams Little Star',
    type: 'Tahams Subsection',
    sub: true,
    frequencyGoal: 1,
    logo: 'assets/logos/star-tahams.png',
    grad: 'var(--grad-star)',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
    lastPostDate: '2026-07-01'
  },
  {
    id: 'merchtile',
    name: 'Merchtile',
    type: 'Wholesale POD Platform',
    sub: false,
    frequencyGoal: 2,
    logo: 'assets/logos/merchtile.png',
    grad: 'var(--grad-merchtile)',
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.15)',
    lastPostDate: '2026-07-03'
  }
];

// Default Team members
const DEFAULT_TEAM = [
  { name: 'Rifat Newaj Razin', role: 'Head of Multimedia & Creative', initial: 'RR', photo: 'assets/rifat-profile.jpg' },
  { name: 'Md. Mahim', role: 'Cinematographer and Video Editor', initial: 'MM' },
  { name: 'Yasin Arafat Rabby', role: 'Designer', initial: 'YR' },
  { name: 'Niaz Uddin', role: 'Junior Designer', initial: 'NU' },
  { name: 'Jubayer Hossain', role: 'Content Planner and Researcher', initial: 'JH', photo: 'assets/jubayer-profile.jpg' },
  { name: 'Mohammad Zahidul Islam', role: 'Content Planner and Researcher', initial: 'ZI' }
];

// Default mock content posts matching date around 2026-07-05
const DEFAULT_POSTS = [
  {
    id: 'post-1',
    title: 'Showcasing Premium Custom T-shirt Mockup Design Flow',
    brandId: 'tahams',
    platforms: ['instagram', 'facebook'],
    status: 'published',
    type: 'video',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-05',
    time: '11:00',
    caption: 'Ever wondered how we craft your customized designs? Here is a sneak peek into our design room! #Tahams #POD #CustomClothing'
  },
  {
    id: 'post-2',
    title: 'Aesthetic Monsoon Wedding Cinematic Reel teaser',
    brandId: 'lovelife',
    platforms: ['facebook', 'instagram'],
    status: 'published',
    type: 'video',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-04',
    time: '18:00',
    caption: 'Rainy days make the most romantic weddings. Teaser from Nabeel & Sarah wedding. #LovelifeMemories #WeddingTeaser'
  },
  {
    id: 'post-3',
    title: 'SammTech Agency Services Pitch & Social Ads Info',
    brandId: 'sammtech',
    platforms: ['facebook'],
    status: 'published',
    type: 'post',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-03',
    time: '10:30',
    caption: 'How social media post boosting can double your business conversions in 30 days. Read our latest agency overview.'
  },
  {
    id: 'post-4',
    title: 'Perfume de Tahams - Summer Oud Launch Post',
    brandId: 'perfume-tahams',
    platforms: ['instagram'],
    status: 'published',
    type: 'post',
    assignee: 'Niaz Uddin',
    date: '2026-07-02',
    time: '15:00',
    caption: 'Refreshing, warm, and luxurious. Summer Oud is now live on our website. Order yours today!'
  },
  {
    id: 'post-5',
    title: 'Merchtile Bulk Clothings Wholesale Promo Graphic',
    brandId: 'merchtile',
    platforms: ['facebook'],
    status: 'published',
    type: 'post',
    assignee: 'Niaz Uddin',
    date: '2026-07-03',
    time: '12:00',
    caption: 'Ready to launch your own POD brand? Buy premium blank hoodies and t-shirts in bulk from Merchtile at manufacturing prices!'
  },
  {
    id: 'post-6',
    title: 'Lumina Premium Cotton Women Collection Showcase',
    brandId: 'lumina-tahams',
    platforms: ['facebook', 'instagram'],
    status: 'published',
    type: 'post',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-04',
    time: '17:30',
    caption: 'Elegance meets comfort. Explore Lumina\'s summer wear catalog.'
  },
  {
    id: 'post-7',
    title: 'Tahams Little Star Kids Pastel Rompers Release Carousel',
    brandId: 'star-tahams',
    platforms: ['instagram', 'facebook'],
    status: 'published',
    type: 'post',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-01',
    time: '14:00',
    caption: 'Softest organic cotton for your little stars. 5 pastel colors available!'
  },
  // Upcoming / active cards
  {
    id: 'post-8',
    title: 'SammTech - Creative Portfolio Case Study (Client X)',
    brandId: 'sammtech',
    platforms: ['facebook'],
    status: 'scheduled',
    type: 'post',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-06',
    time: '14:00',
    caption: 'Case study: How we helped an e-commerce brand scale to $50k monthly revenue with strategic post boosting. #SammTech'
  },
  {
    id: 'post-9',
    title: 'Lovelife Memories - Wedding Photography Packages 2026',
    brandId: 'lovelife',
    platforms: ['instagram', 'facebook'],
    status: 'scheduled',
    type: 'post',
    assignee: 'Rifat Newaj Razin',
    date: '2026-07-07',
    time: '19:00',
    caption: 'Bookings for Autumn & Winter 2026 are now open. Swipe to see our updated packages and team profiles.'
  },
  {
    id: 'post-10',
    title: 'Tahams - Behind the Scenes POD Printing Setup',
    brandId: 'tahams',
    platforms: ['instagram'],
    status: 'ready',
    type: 'video',
    assignee: 'Niaz Uddin',
    date: '2026-07-06',
    time: '16:00',
    caption: 'DtG printing process in full action! Smooth colors and high longevity blanks. #DTG #POD #Printing'
  },
  {
    id: 'post-11',
    title: 'Perfume de Tahams - Floral Mist Story Series',
    brandId: 'perfume-tahams',
    platforms: ['instagram'],
    status: 'development',
    type: 'story',
    assignee: 'Niaz Uddin',
    date: '2026-07-08',
    time: '10:00',
    caption: 'Story series detailing top notes, heart notes, and base notes of Floral Mist.'
  },
  {
    id: 'post-12',
    title: 'Merchtile Platform Feature Walkthrough Video',
    brandId: 'merchtile',
    platforms: ['facebook'],
    status: 'development',
    type: 'video',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-09',
    time: '11:00',
    caption: 'Complete dashboard walkthrough: How to upload bulk orders, integrate with Shopify/WooCommerce, and track shipping.'
  },
  {
    id: 'post-13',
    title: 'Lumina - Neon Vibes Graphic Tshirts Launch',
    brandId: 'lumina-tahams',
    platforms: ['instagram', 'facebook'],
    status: 'ideation',
    type: 'post',
    assignee: 'Niaz Uddin',
    date: '2026-07-10',
    time: '12:00',
    caption: 'Neon design system graphics concept draft.'
  },
  {
    id: 'post-14',
    title: 'Tahams Little Star - Organic Baby Blankets Promo',
    brandId: 'star-tahams',
    platforms: ['facebook'],
    status: 'ideation',
    type: 'post',
    assignee: 'Yasin Arafat Rabby',
    date: '2026-07-12',
    time: '14:30',
    caption: 'Drafting text about winter blankets pre-order.'
  }
];

// User Accounts & Passwords
const USER_ACCOUNTS = {
  'Rifat Newaj Razin': { password: 'rifat123', role: 'Head of Multimedia & Creative', photo: 'assets/rifat-profile.jpg', access: 'admin' },
  'Jubayer Hossain': { password: 'jubayer123', role: 'Content Planner and Researcher', photo: 'assets/jubayer-profile.jpg', access: 'admin' }
};

// App State
let state = {
  brands: [],
  posts: [],
  team: [],
  currentView: 'dashboard',
  selectedBrandFilter: 'all',
  currentDate: new Date('2026-07-05T12:00:00'), // Setting active app date based on user local time
  calendarDate: new Date('2026-07-05T12:00:00'),
  editingPost: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

function initAuth() {
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-user').value;
      const passwordInput = document.getElementById('login-password').value;
      
      const account = USER_ACCOUNTS[username];
      if (account && account.password === passwordInput) {
        localStorage.setItem('hc_logged_in_user', username);
        showToast(`Welcome back, ${username.split(' ')[0]}!`, 'success');
        if (loginOverlay) loginOverlay.style.display = 'none';
        
        renderUserProfile();
        refreshViews();
      } else {
        showToast('Invalid password. Please try again.', 'error');
      }
    });
  }

  // Hide login overlay if clicked outside the card
  if (loginOverlay) {
    loginOverlay.addEventListener('click', (e) => {
      if (e.target === loginOverlay) {
        loginOverlay.style.display = 'none';
      }
    });
  }

  // Always load application immediately (Guest View enabled)
  runAppInit();
}

function showLoginOverlay() {
  const loginOverlay = document.getElementById('login-overlay');
  if (loginOverlay) {
    loginOverlay.style.display = 'flex';
  }
}

function runAppInit() {
  initData();
  setupEventListeners();
  renderUserProfile();
  switchView('dashboard');
  renderDashboard();
  renderKanban();
  renderCalendar();
  renderAnalytics();
  initFilterDropdowns();
}

function renderUserProfile() {
  const userSection = document.querySelector('.user-profile-section');
  if (!userSection) return;
  const currentUser = localStorage.getItem('hc_logged_in_user');
  
  if (currentUser && USER_ACCOUNTS[currentUser]) {
    const account = USER_ACCOUNTS[currentUser];
    const avatarHtml = account.photo 
      ? `<img src="${account.photo}" class="user-avatar-img" alt="${currentUser}">`
      : `<div class="user-avatar" style="background: var(--honey-gold); color: #000; font-weight: 700; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; font-size: 1.1rem; border: 2px solid rgba(255, 255, 255, 0.1); box-shadow: var(--shadow-sm);">${currentUser.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}</div>`;
       
    userSection.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px">
        ${avatarHtml}
        <div class="user-info">
          <span class="user-name" style="font-size: 0.85rem; font-weight: 700; color: #fff; white-space: nowrap;">${currentUser}</span>
          <span class="user-role" style="font-size: 0.7rem; color: #94a3b8;" title="${account.role}">${account.role}</span>
        </div>
      </div>
      <button id="btn-logout" class="logout-btn" title="Logout">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      </button>
    `;
    
    document.getElementById('btn-logout').addEventListener('click', () => {
      localStorage.removeItem('hc_logged_in_user');
      showToast('Logged out successfully', 'info');
      renderUserProfile();
      refreshViews();
    });
  } else {
    // Guest Profile view
    userSection.innerHTML = `
      <button id="btn-login-sidebar" class="login-btn-sidebar">
        <svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
        <span>Sign In to Edit</span>
      </button>
    `;
    
    document.getElementById('btn-login-sidebar').addEventListener('click', () => {
      showLoginOverlay();
    });
  }
}

// Load from LocalStorage or Load Defaults
function initData() {
  const localBrands = localStorage.getItem('hc_brands');
  const localPosts = localStorage.getItem('hc_posts');
  const localTeam = localStorage.getItem('hc_team');

  if (localBrands && localPosts && localTeam) {
    state.brands = JSON.parse(localBrands);
    state.posts = JSON.parse(localPosts);
    state.team = JSON.parse(localTeam);
    
    // Check if the team needs to be updated with new roles.
    // If not, migrate or overwrite the team list.
    const isNewTeamSet = state.team.some(t => t.role === 'Cinematographer and Video Editor');
    if (!isNewTeamSet) {
      state.team = [...DEFAULT_TEAM];
      
      // Update assignee names in existing posts to match the new team names
      state.posts.forEach(p => {
        if (p.assignee === 'Md. Yasin Arafat' || p.assignee === 'Yasin Arafat') {
          p.assignee = 'Yasin Arafat Rabby';
        } else if (p.assignee === 'Niaz' || p.assignee === 'Niaz Uddin') {
          p.assignee = 'Niaz Uddin';
        } else if (p.assignee === 'Self') {
          p.assignee = 'Rifat Newaj Razin';
        }
      });
      saveToStorage();
    }

    // Migrate old post schema (platform string to platforms array)
    state.posts.forEach(p => {
      if (p.platform && !p.platforms) {
        p.platforms = [p.platform];
        delete p.platform;
      }
    });

    // Ensure all weekly goals are strictly set to matching user selection
    const goalsMap = {
      'sammtech': 2,
      'lovelife': 0,
      'tahams': 14,
      'perfume-tahams': 2,
      'lumina-tahams': 1,
      'star-tahams': 1,
      'merchtile': 2
    };
    let goalsUpdated = false;
    state.brands.forEach(b => {
      if (goalsMap[b.id] !== undefined && b.frequencyGoal !== goalsMap[b.id]) {
        b.frequencyGoal = goalsMap[b.id];
        goalsUpdated = true;
      }
    });
    if (goalsUpdated) {
      saveToStorage();
    }

    // Check if the loaded brands need to have logo paths attached
    const sammtechBrandRef = state.brands.find(b => b.id === 'sammtech');
    if (!sammtechBrandRef || sammtechBrandRef.logo === null || sammtechBrandRef.logo === undefined) {
      const logoMap = {
        'sammtech': 'assets/logos/sammtech.png',
        'lovelife': 'assets/logos/lovelife.png',
        'tahams': 'assets/logos/tahams.png',
        'perfume-tahams': 'assets/logos/perfume-tahams.png',
        'lumina-tahams': 'assets/logos/lumina-tahams.png',
        'star-tahams': 'assets/logos/star-tahams.png',
        'merchtile': 'assets/logos/merchtile.png'
      };
      state.brands.forEach(b => {
        b.logo = logoMap[b.id] || null;
      });
      saveToStorage();
    }

    // Migrate post platforms and types in user database
    let migrated = false;
    state.posts.forEach(p => {
      // 1. Filter out youtube and tiktok
      if (p.platforms) {
        const originalLen = p.platforms.length;
        p.platforms = p.platforms.filter(plat => plat !== 'youtube' && plat !== 'tiktok');
        if (p.platforms.length === 0) {
          p.platforms = ['facebook'];
        }
        if (p.platforms.length !== originalLen) {
          migrated = true;
        }
      }
      
      // 2. Map old type keys to new type keys
      if (p.type === 'photo' || p.type === 'article') {
        p.type = 'post';
        migrated = true;
      } else if (p.type === 'text') {
        p.type = 'status';
        migrated = true;
      }
    });
    if (migrated) {
      saveToStorage();
    }

    // Check if team member photos need to be updated in localStorage
    let photoMigrated = false;
    const RifatEntry = state.team.find(t => t.name === 'Rifat Newaj Razin');
    if (RifatEntry && !RifatEntry.photo) {
      RifatEntry.photo = 'assets/rifat-profile.jpg';
      photoMigrated = true;
    }
    const JubayerEntry = state.team.find(t => t.name === 'Jubayer Hossain');
    if (JubayerEntry && JubayerEntry.photo !== 'assets/jubayer-profile.jpg') {
      JubayerEntry.photo = 'assets/jubayer-profile.jpg';
      photoMigrated = true;
    }
    if (photoMigrated) {
      saveToStorage();
    }
  } else {
    state.brands = [...DEFAULT_BRANDS];
    state.posts = [...DEFAULT_POSTS];
    state.team = [...DEFAULT_TEAM];
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem('hc_brands', JSON.stringify(state.brands));
  localStorage.setItem('hc_posts', JSON.stringify(state.posts));
  localStorage.setItem('hc_team', JSON.stringify(state.team));
}

// Navigation & Event Listeners
function setupEventListeners() {
  // Sidebar Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // Top bar brand filters
  const globalFilter = document.getElementById('global-brand-filter');
  if (globalFilter) {
    globalFilter.addEventListener('change', (e) => {
      state.selectedBrandFilter = e.target.value;
      refreshViews();
    });
  }

  // Create post button
  const createBtn = document.getElementById('create-post-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openPostModal();
    });
  }

  // Close modal clicks
  document.querySelectorAll('.close-btn, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closePostModal);
  });

  // Delete post button click
  const deleteBtn = document.getElementById('modal-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deletePost);
  }

  // Visual toggling for platform checkbox labels
  document.querySelectorAll('input[name="post-platforms"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const label = cb.closest('.platform-checkbox-label');
      if (cb.checked) {
        label.classList.add('checked');
      } else {
        label.classList.remove('checked');
      }
    });
  });

  // Form Submit
  const postForm = document.getElementById('post-form');
  if (postForm) {
    postForm.addEventListener('submit', handleFormSubmit);
  }

  // Drag and drop events setup for Kanban columns
  const areas = document.querySelectorAll('.column-cards-area');
  areas.forEach(area => {
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('dragover');
    });

    area.addEventListener('dragleave', () => {
      area.classList.remove('dragover');
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('dragover');
      const postId = e.dataTransfer.getData('text/plain');
      const newStatus = area.getAttribute('data-status');
      updatePostStatus(postId, newStatus);
    });
  });

  // Calendar navigation
  document.getElementById('cal-prev').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    renderCalendar();
  });
}

function switchView(viewName) {
  state.currentView = viewName;
  
  // Update sidebar active status
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle active views
  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `${viewName}-view`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Customize layout elements depending on view
  const headerActions = document.querySelector('.header-actions');
  if (viewName === 'analytics') {
    headerActions.style.display = 'none';
  } else {
    headerActions.style.display = 'flex';
  }

  // Scroll main back to top
  document.querySelector('.main-content').scrollTop = 0;
}

function initFilterDropdowns() {
  const globalFilter = document.getElementById('global-brand-filter');
  const postBrandSelect = document.getElementById('post-brand');
  const postAssigneeSelect = document.getElementById('post-assignee');

  if (globalFilter) {
    globalFilter.innerHTML = '<option value="all">All Brands & Pages</option>';
    state.brands.forEach(b => {
      globalFilter.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });
  }

  if (postBrandSelect) {
    postBrandSelect.innerHTML = '';
    state.brands.forEach(b => {
      postBrandSelect.innerHTML += `<option value="${b.id}">${b.name} (${b.type})</option>`;
    });
  }

  if (postAssigneeSelect) {
    postAssigneeSelect.innerHTML = '';
    state.team.forEach(t => {
      postAssigneeSelect.innerHTML += `<option value="${t.name}">${t.name} (${t.role})</option>`;
    });
  }
}

function refreshViews() {
  renderDashboard();
  renderKanban();
  renderCalendar();
  renderAnalytics();
}

// Render Dashboard View
function renderDashboard() {
  const grid = document.getElementById('dashboard-cards-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filteredBrands = state.selectedBrandFilter === 'all' 
    ? state.brands 
    : state.brands.filter(b => b.id === state.selectedBrandFilter);

  filteredBrands.forEach(brand => {
    // Calculate progress for current week (let's define posts created/scheduled in current week)
    const brandPosts = state.posts.filter(p => p.brandId === brand.id);
    
    // Let's filter posts for this week (using the week of 2026-07-05, Sunday to Saturday)
    // 2026-07-05 is Sunday. So current week is 2026-07-05 to 2026-07-11
    const weekStart = new Date('2026-07-05T00:00:00');
    const weekEnd = new Date('2026-07-11T23:59:59');
    
    const weeklyPosts = brandPosts.filter(p => {
      const pDate = new Date(p.date + 'T00:00:00');
      return pDate >= weekStart && pDate <= weekEnd;
    });

    const publishedCount = weeklyPosts.filter(p => p.status === 'published').length;
    const goal = brand.frequencyGoal;
    const progressPct = goal > 0 ? Math.min(Math.round((publishedCount / goal) * 100), 100) : 100;

    // Determine health status
    let healthStatus = 'Healthy';
    let healthClass = 'status-healthy-badge';
    
    // Check overdue posts: Status scheduled/ready/development but date before 2026-07-05
    const overduePosts = brandPosts.filter(p => {
      const pDate = new Date(p.date + 'T00:00:00');
      return p.status !== 'published' && pDate < new Date('2026-07-05T00:00:00');
    });

    if (overduePosts.length > 0) {
      healthStatus = 'Critical';
      healthClass = 'status-critical-badge';
    } else if (publishedCount < Math.ceil(goal / 2) && new Date().getDay() > 3) {
      // It's past mid-week and less than half of goals published
      healthStatus = 'Warning';
      healthClass = 'status-warning-badge';
    }

    const card = document.createElement('div');
    card.className = 'brand-card';
    card.style.setProperty('--brand-grad', brand.grad);
    card.innerHTML = `
      <div class="brand-header">
        <div class="brand-info-wrap">
          ${brand.logo 
            ? `<img src="${brand.logo}" class="brand-badge-img" alt="${brand.name} logo">`
            : `<div class="brand-badge-icon" style="background: ${brand.grad}">${brand.name.substring(0,2).toUpperCase()}</div>`}
          <div class="brand-title-wrap">
            <h3>${brand.name}</h3>
            <div class="brand-subtitle">${brand.type}</div>
          </div>
        </div>
        ${healthStatus !== 'Healthy' ? `<div class="status-indicator ${healthClass}">${healthStatus}</div>` : ''}
      </div>

      <div class="metric-row">
        <div class="metric-box">
          <div class="metric-val">${publishedCount}</div>
          <div class="metric-label">Published</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">${goal}</div>
          <div class="metric-label">Goal / Wk</div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-label-wrap">
          <span>Weekly Goal Progress</span>
          <span class="progress-pct">${progressPct}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progressPct}%; background: ${brand.grad}"></div>
        </div>
      </div>

      <div class="brand-footer">
        <span>Last post: <strong>${brand.lastPostDate || 'Never'}</strong></span>
        <span>Total: <strong>${brandPosts.length} posts</strong></span>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Render Kanban Board View
function renderKanban() {
  const columns = ['ideation', 'development', 'ready', 'scheduled', 'published'];
  
  columns.forEach(col => {
    const colArea = document.querySelector(`.column-cards-area[data-status="${col}"]`);
    if (!colArea) return;
    colArea.innerHTML = '';

    let colPosts = state.posts.filter(p => p.status === col);
    if (state.selectedBrandFilter !== 'all') {
      colPosts = colPosts.filter(p => p.brandId === state.selectedBrandFilter);
    }

    // Update count indicator
    const countBadge = colArea.closest('.kanban-column').querySelector('.column-count');
    if (countBadge) {
      countBadge.textContent = colPosts.length;
    }

    colPosts.forEach(post => {
      const brand = state.brands.find(b => b.id === post.brandId);
      if (!brand) return;

      const card = document.createElement('div');
      card.className = 'post-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', post.id);
      card.style.setProperty('--brand-grad', brand.grad);
      card.style.setProperty('--brand-color', brand.color);
      card.style.setProperty('--brand-glow', brand.glow);

      // Determine platform icons
      const platformBadgesHtml = (post.platforms || []).map(p => {
        const platformIcon = getPlatformIcon(p);
        return `
          <span class="card-platform-badge" title="${p.toUpperCase()}">
            ${platformIcon}
          </span>
        `;
      }).join('');
      
      // Determine if post is overdue
      const isOverdue = post.status !== 'published' && new Date(post.date + 'T00:00:00') < new Date('2026-07-05T00:00:00');
      const dateClass = isOverdue ? 'card-due-date overdue' : 'card-due-date';
      const assigneeInitials = getAssigneeInitials(post.assignee);

      card.innerHTML = `
        <div class="card-top">
          <span class="card-brand-tag">
            ${brand.logo ? `<img src="${brand.logo}" class="card-brand-logo" alt="">` : ''}
            <span>${brand.name}</span>
          </span>
          <div style="display: flex; gap: 6px; align-items: center">
            ${platformBadgesHtml}
          </div>
        </div>
        <div class="card-title">${post.title}</div>
        <div class="card-meta">
          <div class="card-assignee">
            ${(state.team.find(t => t.name === post.assignee) || {}).photo 
              ? `<img src="${(state.team.find(t => t.name === post.assignee) || {}).photo}" class="card-assignee-avatar-img" title="${post.assignee}">`
              : `<div class="card-assignee-avatar" title="${post.assignee}">${assigneeInitials}</div>`}
            <span>${post.assignee.split(' ')[0]}</span>
          </div>
          <div class="${dateClass}">
            <svg viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>
            <span>${formatCardDate(post.date)}</span>
          </div>
        </div>
      `;

      // Click to edit
      card.addEventListener('click', (e) => {
        // Prevent click when dragging
        if (e.target.closest('.card-assignee-avatar')) return;
        openPostModal(post);
      });

      // Drag listeners
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', post.id);
        card.style.opacity = '0.5';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
      });

      colArea.appendChild(card);
    });
  });
}

// Render Calendar View
function renderCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const calTitle = document.getElementById('calendar-title');
  const calDaysArea = document.getElementById('calendar-days-grid');
  if (!calTitle || !calDaysArea) return;

  const currentYear = state.calendarDate.getFullYear();
  const currentMonth = state.calendarDate.getMonth();

  calTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  calDaysArea.innerHTML = '';

  // Get first day of the month
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Get number of days in current month
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Get number of days in previous month
  const prevNumDays = new Date(currentYear, currentMonth, 0).getDate();

  // Draw previous month's trailing days
  for (let i = firstDayIndex; i > 0; i--) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day-cell other-month';
    dayCell.innerHTML = `<span class="calendar-day-num">${prevNumDays - i + 1}</span>`;
    calDaysArea.appendChild(dayCell);
  }

  // Draw current month's days
  for (let day = 1; day <= numDays; day++) {
    const dayCell = document.createElement('div');
    
    // Format cell date string: YYYY-MM-DD
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if it is today (2026-07-05)
    const isToday = dateStr === '2026-07-05';
    dayCell.className = `calendar-day-cell${isToday ? ' today' : ''}`;
    
    dayCell.innerHTML = `
      <span class="calendar-day-num">${day}</span>
      <div class="calendar-events"></div>
    `;

    // Filter posts for this date
    let dayPosts = state.posts.filter(p => p.date === dateStr);
    if (state.selectedBrandFilter !== 'all') {
      dayPosts = dayPosts.filter(p => p.brandId === state.selectedBrandFilter);
    }

    const eventsArea = dayCell.querySelector('.calendar-events');
    dayPosts.forEach(post => {
      const brand = state.brands.find(b => b.id === post.brandId);
      if (!brand) return;

      const eventItem = document.createElement('div');
      eventItem.className = 'calendar-event-item';
      eventItem.style.setProperty('--brand-glow', brand.glow);
      eventItem.style.setProperty('--brand-color', brand.color);
      eventItem.textContent = `[${brand.name.substring(0,3)}] ${post.title}`;
      eventItem.title = `${brand.name}: ${post.title} (${(post.platforms || []).join(', ').toUpperCase()})`;
      
      eventItem.addEventListener('click', (e) => {
        e.stopPropagation();
        openPostModal(post);
      });

      eventsArea.appendChild(eventItem);
    });

    // Quick add click event on cell
    dayCell.addEventListener('click', () => {
      openPostModal(null, dateStr);
    });

    calDaysArea.appendChild(dayCell);
  }

  // Draw next month's leading days to complete the calendar grid (rows of 7 days, up to 42 cells)
  const totalCells = firstDayIndex + numDays;
  const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= nextMonthDays; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day-cell other-month';
    dayCell.innerHTML = `<span class="calendar-day-num">${i}</span>`;
    calDaysArea.appendChild(dayCell);
  }
}

// Render Analytics View
function renderAnalytics() {
  const totalPostsEl = document.getElementById('stat-total-posts');
  const publishedPostsEl = document.getElementById('stat-published-posts');
  const completionRateEl = document.getElementById('stat-completion-rate');
  
  if (!totalPostsEl) return;

  // Filter calculations based on global filter
  let analyticsPosts = state.posts;
  if (state.selectedBrandFilter !== 'all') {
    analyticsPosts = analyticsPosts.filter(p => p.brandId === state.selectedBrandFilter);
  }

  const totalCount = analyticsPosts.length;
  const publishedCount = analyticsPosts.filter(p => p.status === 'published').length;
  const completionRate = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0;

  // Update top metrics
  totalPostsEl.textContent = totalCount;
  publishedPostsEl.textContent = publishedCount;
  completionRateEl.textContent = `${completionRate}%`;

  // Render Chart (Bar chart by Brand/Subsection)
  const chartContainer = document.getElementById('analytics-chart');
  const legendList = document.getElementById('analytics-legend');
  if (!chartContainer || !legendList) return;

  chartContainer.innerHTML = '';
  legendList.innerHTML = '';

  state.brands.forEach(brand => {
    const brandPosts = state.posts.filter(p => p.brandId === brand.id);
    const publishedBrandCount = brandPosts.filter(p => p.status === 'published').length;
    
    // Scale height based on posts (assume max 10 posts for layout scale)
    const maxScale = Math.max(...state.brands.map(b => state.posts.filter(p => p.brandId === b.id && p.status === 'published').length), 1);
    const pctHeight = Math.round((publishedBrandCount / maxScale) * 80); // scale up to 80% of area

    // Create Bar
    const barWrap = document.createElement('div');
    barWrap.className = 'chart-bar-wrap';
    barWrap.innerHTML = `
      <div class="chart-bar-fill" data-value="${publishedBrandCount}" style="height: ${pctHeight}%; background: ${brand.grad}"></div>
      <div class="chart-bar-label">${brand.name}</div>
    `;
    chartContainer.appendChild(barWrap);

    // Create Legend Item
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-info">
        <div class="legend-color" style="background: ${brand.grad}"></div>
        <span class="legend-name">${brand.name}</span>
      </div>
      <span class="legend-value">${publishedBrandCount} / ${brandPosts.length} published</span>
    `;
    legendList.appendChild(legendItem);
  });
}

// Drag & Drop / Status Update
function updatePostStatus(postId, newStatus) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  const currentUser = localStorage.getItem('hc_logged_in_user');
  
  // Guest protection: Guests cannot drag/move cards
  if (!currentUser) {
    showToast('Access Denied: Please sign in to reschedule items', 'error');
    showLoginOverlay();
    refreshViews();
    return;
  }

  // Access control check for limited users
  const account = USER_ACCOUNTS[currentUser];
  const isLimited = account && account.access === 'limited';
  if (isLimited && post.assignee !== 'Jubayer Hossain') {
    showToast('Access Denied: You can only move items assigned to you', 'error');
    refreshViews(); // Re-renders list to reset the visual card placement
    return;
  }

  const oldStatus = post.status;
  post.status = newStatus;

  // If status changed to published, update brand last post date
  if (newStatus === 'published' && oldStatus !== 'published') {
    const brand = state.brands.find(b => b.id === post.brandId);
    if (brand) {
      brand.lastPostDate = post.date;
    }
  }

  saveToStorage();
  refreshViews();
  showToast(`Successfully moved to "${newStatus.toUpperCase()}"`, 'success');
}

// Post Creation & Editing Modal
function openPostModal(post = null, targetDate = null) {
  const currentUser = localStorage.getItem('hc_logged_in_user');

  // Accessibility: Guests cannot create new posts at all
  if (!post && !currentUser) {
    showToast('Access Denied: Please sign in to schedule content', 'error');
    showLoginOverlay();
    return;
  }

  state.editingPost = post;
  const overlay = document.getElementById('post-modal');
  const modalTitle = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('modal-delete-btn');
  const form = document.getElementById('post-form');
  
  if (!overlay || !form) return;

  // Reset Form Checkboxes and accessibility states
  form.reset();
  form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.removeAttribute('disabled'));
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.style.display = 'block';
  
  const existingBanner = document.getElementById('modal-view-only-banner');
  if (existingBanner) existingBanner.remove();

  document.querySelectorAll('input[name="post-platforms"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.platform-checkbox-label').classList.remove('checked');
  });

  const account = USER_ACCOUNTS[currentUser];
  const isLimited = account && account.access === 'limited';

  if (post) {
    // Edit Mode
    modalTitle.textContent = 'Edit Content Post';
    
    // Accessibility: Guests and Limited users cannot delete posts at all
    if (deleteBtn) {
      deleteBtn.style.display = (!currentUser || isLimited) ? 'none' : 'block';
    }

    document.getElementById('post-title').value = post.title;
    document.getElementById('post-brand').value = post.brandId;
    document.getElementById('post-status').value = post.status;
    document.getElementById('post-type').value = post.type;
    document.getElementById('post-assignee').value = post.assignee;
    document.getElementById('post-date').value = post.date;
    document.getElementById('post-time').value = post.time;
    document.getElementById('post-caption').value = post.caption;

    if (post.platforms) {
      post.platforms.forEach(p => {
        const cb = document.querySelector(`input[name="post-platforms"][value="${p}"]`);
        if (cb) {
          cb.checked = true;
          cb.closest('.platform-checkbox-label').classList.add('checked');
        }
      });
    }

    // Accessibility: Guests get complete Read-Only view
    if (!currentUser) {
      form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.setAttribute('disabled', 'true'));
      if (submitBtn) submitBtn.style.display = 'none';
      
      const formBody = form.querySelector('.modal-body') || form;
      const warningHtml = `
        <div id="modal-view-only-banner" class="view-only-banner">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
          <span>Guest Mode: Sign in to reschedule or edit this item.</span>
        </div>
      `;
      formBody.insertAdjacentHTML('afterbegin', warningHtml);
    }
    // Accessibility: Limited users can only edit posts assigned to them
    else if (isLimited && post.assignee !== 'Jubayer Hossain') {
      form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.setAttribute('disabled', 'true'));
      if (submitBtn) submitBtn.style.display = 'none';
      
      const formBody = form.querySelector('.modal-body') || form;
      const warningHtml = `
        <div id="modal-view-only-banner" class="view-only-banner">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01"/></svg>
          <span>View Only: This post is assigned to ${post.assignee}. You can only edit posts assigned to you.</span>
        </div>
      `;
      formBody.insertAdjacentHTML('afterbegin', warningHtml);
    }
  } else {
    // Add Mode
    modalTitle.textContent = 'Create New Content Post';
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Autofill date if clicked from calendar
    if (targetDate) {
      document.getElementById('post-date').value = targetDate;
    } else {
      document.getElementById('post-date').value = '2026-07-05';
    }
    document.getElementById('post-time').value = '12:00';
    document.getElementById('post-status').value = 'ideation';

    // Check Facebook by default
    const fb = document.querySelector('input[name="post-platforms"][value="facebook"]');
    if (fb) {
      fb.checked = true;
      fb.closest('.platform-checkbox-label').classList.add('checked');
    }

    // Default assignee to creator for limited users to avoid mistakes
    if (isLimited) {
      document.getElementById('post-assignee').value = 'Jubayer Hossain';
    }
  }

  overlay.classList.add('active');
}

function closePostModal() {
  const overlay = document.getElementById('post-modal');
  if (overlay) {
    overlay.classList.remove('active');
  }
  state.editingPost = null;

  // Reset form fields back to enabled state
  const form = document.getElementById('post-form');
  if (form) {
    form.querySelectorAll('.form-control, input[type="checkbox"]').forEach(el => el.removeAttribute('disabled'));
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.style.display = 'block';
  }
  const existingBanner = document.getElementById('modal-view-only-banner');
  if (existingBanner) existingBanner.remove();
}

function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('post-title').value.trim();
  const brandId = document.getElementById('post-brand').value;
  const checkedPlatforms = Array.from(document.querySelectorAll('input[name="post-platforms"]:checked')).map(cb => cb.value);
  const status = document.getElementById('post-status').value;
  const type = document.getElementById('post-type').value;
  const assignee = document.getElementById('post-assignee').value;
  const date = document.getElementById('post-date').value;
  const time = document.getElementById('post-time').value;
  const caption = document.getElementById('post-caption').value.trim();

  if (!title) {
    showToast('Please enter a content title', 'error');
    return;
  }

  if (checkedPlatforms.length === 0) {
    showToast('Please select at least one target platform', 'error');
    return;
  }

  if (state.editingPost) {
    // Edit existing post
    const post = state.posts.find(p => p.id === state.editingPost.id);
    if (post) {
      const oldStatus = post.status;
      post.title = title;
      post.brandId = brandId;
      post.platforms = checkedPlatforms;
      post.status = status;
      post.type = type;
      post.assignee = assignee;
      post.date = date;
      post.time = time;
      post.caption = caption;

      // Update brand last active date if just published
      if (status === 'published' && oldStatus !== 'published') {
        const brand = state.brands.find(b => b.id === brandId);
        if (brand) {
          brand.lastPostDate = date;
        }
      }
    }
    showToast('Post updated successfully', 'success');
  } else {
    // Create new post
    const newPost = {
      id: 'post-' + Date.now(),
      title,
      brandId,
      platforms: checkedPlatforms,
      status,
      type,
      assignee,
      date,
      time,
      caption
    };
    state.posts.push(newPost);
    
    // Update brand last active date if just published
    if (status === 'published') {
      const brand = state.brands.find(b => b.id === brandId);
      if (brand) {
        brand.lastPostDate = date;
      }
    }
    
    showToast('New post scheduled successfully', 'success');
  }

  saveToStorage();
  closePostModal();
  refreshViews();
}

// Delete post from edit modal
function deletePost() {
  if (!state.editingPost) return;
  
  if (confirm('Are you sure you want to delete this content item?')) {
    state.posts = state.posts.filter(p => p.id !== state.editingPost.id);
    saveToStorage();
    closePostModal();
    refreshViews();
    showToast('Content item removed', 'info');
  }
}

// Delete click listener setup has been moved to setupEventListeners()

// Helper Utilities
function getPlatformIcon(platform) {
  // Returns SVG string for platform logo
  switch(platform) {
    case 'facebook':
      return `<svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>`;
    case 'instagram':
      return `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;
    case 'linkedin':
      return `<svg viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
    case 'youtube':
      return `<svg viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    case 'tiktok':
      return `<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.2-.42-.43-.61-.67-.02 3.76-.01 7.52-.02 11.28-.03 1.2-.24 2.44-.82 3.5-1.45 2.65-4.5 4.15-7.5 3.79-3.23-.39-5.94-2.88-6.39-6.11-.64-4.54 2.87-8.77 7.4-8.89.14 0 .28.01.42.02v4.07a4.78 4.78 0 00-3.69 4.14c-.45 2.61 1.48 5.13 4.11 5.37 2.37.22 4.67-1.34 5.06-3.7.1-.6.12-1.21.11-1.81-.01-5.71 0-11.43-.01-17.15-.46-.01-.93-.04-1.39-.1-.73-.1-1.46-.3-2.13-.6-.35-.16-.68-.37-.98-.62.01-.8.01-1.61.02-2.42z"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg>`;
  }
}

function getAssigneeInitials(name) {
  if (name === 'Self') return 'ME';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatCardDate(dateStr) {
  // e.g. 2026-07-05 -> Jul 5
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const m = months[parseInt(parts[1]) - 1];
    const d = parseInt(parts[2]);
    return `${m} ${d}`;
  }
  return dateStr;
}

// Success Notification Toast Helper
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-wrapper');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-msg">${msg}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
