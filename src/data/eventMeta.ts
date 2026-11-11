import heroLandscape from '../assets/images/fayoum_lake_hero_1794360420591.jpg';
import type { CategoryMeta, EventCategory } from '../types/event';

export const HERO_LANDSCAPE_IMAGE = heroLandscape;

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  workshop: 'ورشة عمل',
  course: 'دورة',
  event: 'فعالية',
};

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'workshop',
    label: 'ورشة عمل',
    pluralLabel: 'ورش العمل',
    description:
      'جلسات تطبيقية مكثفة لبناء مهارات عملية في التقنية، التصميم، والحرف الإبداعية مع مدربين من الفيوم.',
    countLabel: 'تطبيق عملي ومباشر',
  },
  {
    id: 'course',
    label: 'دورة',
    pluralLabel: 'الدورات التدريبية',
    description:
      'برامج تدريبية منظمة تمتد لعدة لقاءات لتأهيل الشباب لسوق العمل وريادة الأعمال والقيادة المجتمعية.',
    countLabel: 'مسار تعليمي متكامل',
  },
  {
    id: 'event',
    label: 'فعالية',
    pluralLabel: 'الفعاليات والملتقيات',
    description:
      'ملتقيات ثقافية، جولات تصوير في طبيعة الفيوم، ومبادرات مجتمعية تجمع الشباب وتفتح آفاق التعاون.',
    countLabel: 'تواصل وتجارب حية',
  },
];
