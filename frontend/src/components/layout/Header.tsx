import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.scss';
import { SearchIcon, UserIcon, BellIcon, SendEmailIcon, CampaignsIcon, HistoryIcon, ContactsIcon, DashboardIcon } from '@/assets/icons';

interface HeaderProps {
    onMenuClick: () => void;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
}

const navItems: NavItem[] = [
    {
        id: 'campaigns',
        label: 'Campaigns',
        icon: CampaignsIcon,
        path: '/campaigns',
    },
    {
        id: 'history',
        label: 'History',
        icon: HistoryIcon,
        path: '/history',
    }
];

const Header = ({ onMenuClick }: HeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavClick = (path: string) => {
        navigate(path);
    };

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <header className={styles.header}>
            <div className={styles.navItems}>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                        onClick={() => handleNavClick(item.path)}
                    >
                        <item.icon className={styles.navIcon} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
            {/* <div className={styles.logo}>
                <div className={styles.menuIcon} onClick={onMenuClick}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div> */}
            <div className={styles.actions}>
                <button className={styles.iconButton}>
                    <SearchIcon />
                </button>
                <button className={styles.iconButton}>
                    <UserIcon />
                </button>
                <button className={styles.iconButton}>
                    <BellIcon />
                    <span className={styles.badge}>10</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
