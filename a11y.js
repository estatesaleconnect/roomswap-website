// Accessibility helpers shared by every page: keeps the mobile menu's
// aria-expanded in sync, closes it with Escape, and moves focus to form
// confirmations so screen reader users hear that their message was sent.
(function () {
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
        var sync = function () {
            toggle.setAttribute('aria-expanded', nav.classList.contains('active') ? 'true' : 'false');
        };
        new MutationObserver(sync).observe(nav, { attributes: true, attributeFilter: ['class'] });
        sync();
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                nav.classList.remove('active');
                toggle.focus();
            }
        });
    }

    document.querySelectorAll('.form-success').forEach(function (box) {
        new MutationObserver(function () {
            if (box.style.display !== 'none') box.focus();
        }).observe(box, { attributes: true, attributeFilter: ['style'] });
    });
})();
