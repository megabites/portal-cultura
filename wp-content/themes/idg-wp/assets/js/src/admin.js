(function ($) {
	$(document).ready(function () {
		admin.init();
	});

	var admin = {
		init: function () {
			this.idgWidgets();
		},

		idgWidgets: function () {
			$(document).on('keyup', '.idg-feature-card-widget .card-title', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-title').text($(this).val());
			});

			$(document).on('change', '.idg-feature-card-widget .icon-selector', function () {
				$(this).closest('.idg-feature-card-widget').find('.feature-card .icon').removeClass().addClass('icon ' + $(this).val());
			});

			$(document).on('change', '.idg-feature-card-widget .card-model', function () {
				var cardModel = $(this).val();
				$(this).closest('.idg-feature-card-widget').find('.feature-card').removeClass().addClass('feature-card static-height ' + cardModel );
				if( cardModel === 'card-3' ){
					$(this).closest('.idg-feature-card-widget').find('.card-desc-wrapper').removeClass('hidden');
					$(this).closest('.idg-feature-card-widget').find('.feature-card .card-desc, .feature-card .card-btn').show();
				} else {
					$(this).closest('.idg-feature-card-widget').find('.card-desc-wrapper').addClass('hidden');
					$(this).closest('.idg-feature-card-widget').find('.feature-card .card-desc, .feature-card .card-btn').hide();
				}
			});

			$(document).on('keyup', '.idg-feature-card-widget .card-desc', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-desc').text($(this).val());
			});
		}
	};
})(jQuery);
