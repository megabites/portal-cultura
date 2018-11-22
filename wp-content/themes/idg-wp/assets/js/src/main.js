(function ($) {
	$(document).ready(function () {
		app.init();
	});

	var app = {
		init: function () {
			this.accessibility();
			this.utils();
			// this.agenda();
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
		 * Utility functions, used on all sites
		 *
		 */
		utils: function () {
			// Enable bootstrap tooltip
			$('[data-toggle="tooltip"]').tooltip();

			// Fancybox for gallery media
			if( $('.gallery').length ){
				$('.gallery-item').each( function () {
					var caption = $(this).find('.gallery-caption').text();
					$(this).find('a').attr( 'data-caption', caption );
				});
				$('.gallery-item a').attr( 'data-fancybox', 'group' );
				$('.gallery-item a').fancybox({});
			}

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
