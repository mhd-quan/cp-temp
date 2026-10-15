// Ấn bản: one map of the site. The masthead, the phone menu and the footer
// are all drawn from these groups, in this order, so the three never
// disagree about where anything is.
import { SUBSTACK_SUBSCRIBE_URL } from './newsletter';

export interface NavLink {
  href: string;
  label: string;
  external?: boolean;
  glyph?: 'external' | 'rss' | 'mail';
}
export interface NavGroup {
  id: string;
  label: string;
  links: NavLink[];
}

/** Thể nghiệm: what is made to be done, not only read (La bàn Tư tưởng, and what follows it). */
export const EXPERIMENTS = '/the-nghiem';
export const COMPASS = `${EXPERIMENTS}/la-ban-tu-tuong`;

// The masthead and the bar hold five: Lưu trữ, the same essays by month, is
// kept for the menu and the footer, and its place on the bar went to Thể nghiệm.
export const SECTIONS: NavLink[] = [
  { href: '/essays', label: 'Tiểu luận' },
  { href: '/pensees', label: 'Pensées' },
  { href: '/series', label: 'Chuyên đề' },
  { href: '/books', label: 'Điểm sách' },
  { href: EXPERIMENTS, label: 'Thể nghiệm' },
];

export const READ: NavLink[] = [...SECTIONS, { href: '/archives', label: 'Lưu trữ' }];

export const HOUSE: NavLink[] = [
  { href: '/about', label: 'Giới thiệu' },
  { href: '/authors', label: 'Tác giả' },
  { href: '/privacy', label: 'Quyền riêng tư' },
];

/** Where letters go: to the people who write here, not to an office. */
export const LETTERS = 'mailto:letters@cochinchinepensees.studio';

// The ways to follow, as channels. The action itself (Nhận bài mới) is the
// button of the masthead and the menu and the call of the colophon; listed
// here as well, beside Substack, it named the same thing twice.
export const FOLLOW: NavLink[] = [
  { href: SUBSTACK_SUBSCRIBE_URL, label: 'Substack', external: true, glyph: 'external' },
  { href: '/rss.xml', label: 'RSS', glyph: 'rss' },
  { href: LETTERS, label: 'Gửi thư', glyph: 'mail' },
];

/** Below the ways to follow, in the colophon and the menu: the publication on a
    home screen (lib/editionInstall.ts), shown only where a browser can put it there. */
export const INSTALL = 'Thêm vào màn hình chính';

export const GROUPS: NavGroup[] = [
  { id: 'read', label: 'Đọc', links: READ },
  { id: 'house', label: 'Về chúng tôi', links: HOUSE },
  { id: 'follow', label: 'Theo dõi', links: FOLLOW },
];
