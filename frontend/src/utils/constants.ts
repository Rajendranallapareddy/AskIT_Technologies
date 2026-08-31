export const BRAND = {
  name: 'ASK IT',
  fullName: 'ASK IT Technologies',
  tagline: 'Learn Today | Grow Tomorrow | Succeed Always',
  subTagline: 'Quality Training. Real-Time Experience. Real Results.',
  email: 'info@askittechnologies.com',
  phones: ['8019790779', '9381224606'],
  //address: 'Hyderabad, Telangana, India',
  website: 'www.askittechnologies.com',
};

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Courses', to: '/courses' },
  { label: 'Internships', to: '/internships' },
  { label: 'Trainers', to: '/trainers' },
  { label: 'Placements', to: '/placements' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
];

export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  SUB_ADMIN: '/admin/dashboard',
  TRAINER: '/trainer/dashboard',
  USER: '/dashboard',
};
