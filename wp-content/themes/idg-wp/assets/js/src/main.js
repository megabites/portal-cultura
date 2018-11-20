(function ($) {
	$(document).ready(function () {
		app.init();
	});

	var app = {
		init: function () {
			this.accessibility();
			// this.utils();
			// this.agenda();
			this.menu();
			console.log('App here!');
		},

		/**
		 * Accessibility functions
		 *
		 */
		accessibility: function () {
			// High contrast
			$('#high-contrast-btn').click(function (e) {
				e.preventDefault();
				var highContrast = cookie('high-contrast');

				if (highContrast === 'on') {
					cookie('high-contrast', 'off');
					$('body').removeClass('high-contrast');
				} else {
					cookie('high-contrast', 'on');
					$('body').addClass('high-contrast');
				}
			})
		},

		/**
		 * Menu Functions
		 *
		 */
		menu: function () {
			// High contrast
			$('#menu-toggle').click(function () {
				$('body').toggleClass('menu-active');
			})

			$('#menu-wrapper, #menu-toggle').click(function(event){
				// event.stopPropagation();
			});

			$('#main-header').click(function(event){
				$('body').removeClass('menu-active');
			});

			$('.widget_nav_menu').click(function() {
				$(this).toggleClass('active');
			});
		},

		/**
		 * Utility functions, used on all sites
		 *
		 */
		utils: function () {
			// Enable bootstrap tooltip
			// $('[data-toggle="tooltip"]').tooltip();


		},

		agenda: function () {
			$('#datepicker').datepicker({
				dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
			});

			$('.monthpicker').on('click', function (e) {
				e.preventDefault();
				$('.monthpicker').datepicker('show');
			})
		}
	};
})(jQuery);
