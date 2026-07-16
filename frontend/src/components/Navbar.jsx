import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const FARMER_LINKS = [
  ['/farmer/map', 'Farm Map'],
  ['/farmer/documents', 'Documents'],
  ['/farmer/dashboard', 'Dashboard'],
  ['/farmer/passport', 'Passport'],
  ['/farmer/analytics', 'Analytics'],
  ['/marketplace', 'Marketplace'],
  ['/dao', 'DAO'],
];

const COMPANY_LINKS = [
  ['/company/dashboard', 'Dashboard'],
  ['/marketplace', 'Marketplace'],
  ['/dao', 'DAO'],
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'farmer' ? FARMER_LINKS : user?.role === 'company' ? COMPANY_LINKS : [];

  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: '#fff' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', color: 'var(--ink)', textDecoration: 'none' }}>
          AgriCarbon <span style={{ color: 'var(--wheat)' }}>DAO</span>
        </Link>

        <nav style={{ display: 'flex', gap: '1.4rem', alignItems: 'center' }}>
          {links.map(([to, label]) => (
            <Link key={to} to={to} style={{ fontSize: '0.9rem', color: 'var(--ink)', textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link to="/admin" style={{ fontSize: '0.9rem', color: 'var(--ink)', textDecoration: 'none' }}>
              Admin Panel
            </Link>
          )}

          {user ? (
            <button
              className="ghost"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
            >
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>Log in</Link>
              <Link to="/register"><button className="primary">Register</button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
