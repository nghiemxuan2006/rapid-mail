import { type ReactNode, useState } from 'react';
import styles from './MainLayout.module.scss';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className={styles.mainLayout}>
            <Header onMenuClick={toggleSidebar} />
            <div className={styles.container}>
                {/* <Sidebar isCollapsed={isSidebarCollapsed} /> */}
                <main className={`${styles.content} ${isSidebarCollapsed ? styles.expanded : ''}`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
