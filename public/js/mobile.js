// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    const mobileIcon = mobileMenuBtn.querySelector('i');
    let mobileMenuOpen = false;

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
        
        if (mobileMenuOpen) {
            mobileNav.classList.add('active');
            mobileIcon.classList.remove('fa-bars');
            mobileIcon.classList.add('fa-times');
            document.body.classList.add('menu-open');
        } else {
            mobileNav.classList.remove('active');
            mobileIcon.classList.remove('fa-times');
            mobileIcon.classList.add('fa-bars');
            document.body.classList.remove('menu-open');
        }
    }

    // Toggle menu on button click
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMobileMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (mobileMenuOpen && !mobileNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            toggleMobileMenu();
        }
    });

    // Close menu when clicking on a link
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            toggleMobileMenu();
        });
    });

    // Close menu on window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 968 && mobileMenuOpen) {
            toggleMobileMenu();
        }
    });

    // Prevent scroll when menu is open
    mobileNav.addEventListener('touchmove', function(e) {
        if (!mobileMenuOpen) {
            e.preventDefault();
        }
    }, { passive: false });
}); 