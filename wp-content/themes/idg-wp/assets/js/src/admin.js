(function ($) {
	$(document).ready(function () {
		admin.init();
	});

	var admin = {
		init: function () {
			this.idgFeatureCardWidgets();
			this.idgBannersWidgets();
		},

		idgFeatureCardWidgets: function () {
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
		},

		idgBannersWidgets: function () {

			$(document).on('click', '.number-of-banners-input', function (e) {
				wpWidgets.save( $(this).closest('.widget'), 0, 1, 0);
			});

			$(document).on('click', '.upload_image_button', function (e) {
				e.preventDefault();
				var clickedButton = $(this);

				wp.media.editor.send.attachment = function(props, attachment){
					console.log( props, attachment );
					clickedButton.prev('input').val( attachment.id );
					clickedButton.parent().find('img.banner-img-preview').attr( 'src', attachment.url );
					wpWidgets.save( clickedButton.closest('.widget'), 0, 1, 0);
				};
				wp.media.editor.open( clickedButton );
			});

			$(document).on('click', '.remove-banner-item', function (e) {
				e.preventDefault();
				var banners = $(this).closest('.idg-banners-widget'),
					n = banners.find('.banners-items .banner').length;

				$(this).closest('.banner').addClass('deleting-banner').fadeOut();
				banners.find('.number-of-banners-input').val( n - 1 );
				banners.find('.banner.deleting-banner').remove();
				wpWidgets.save( banners.closest('.widget'), 0, 1, 0);
			});

		}
	};
})(jQuery);
