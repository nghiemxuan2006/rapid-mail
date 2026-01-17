import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.scss';
import {
    DashboardIcon,
    SendEmailIcon,
    CampaignsIcon,
    HistoryIcon,
    ContactsIcon
} from '@/assets/icons';

interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/',
        icon: DashboardIcon,
    },
    {
        id: 'send-email',
        label: 'Send Email',
        path: '/email-template',
        icon: SendEmailIcon,
    },
    {
        id: 'campaigns',
        label: 'Campaigns',
        path: '/campaigns',
        icon: CampaignsIcon,
    },
    {
        id: 'history',
        label: 'History',
        path: '/history',
        icon: HistoryIcon,
    },
    {
        id: 'contacts',
        label: 'Contacts',
        path: '/contacts',
        icon: ContactsIcon,
    },
];

interface SidebarProps {
    isCollapsed: boolean;
}

const Sidebar = ({ isCollapsed }: SidebarProps) => {
    const location = useLocation();

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <Icon className={styles.icon} />
                            <span className={styles.label}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;