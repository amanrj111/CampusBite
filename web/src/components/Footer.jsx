
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="campus-footer">
      <div className="footer-container">

        <div className="footer-brand">
          <h2>
            Campus<span>Bite</span> 🍔
          </h2>
          <p>
            Smart Campus Canteen Ordering System.
            Less waiting, more time, smarter campus dining.
          </p>
        </div>

        <div className="footer-info">
          <h3>Our Mission</h3>
          <p>
            Making campus food ordering faster,
            easier, and more convenient for everyone.
          </p>
        </div>

      </div>

      <div className="footer-bottom">
        <p>
          © 2026 CampusBite. All Rights Reserved.
        </p>

        <p>
          Created & Developed by
          <span> Aman Raj</span>
        </p>
      </div>
    </footer>
  );
}
