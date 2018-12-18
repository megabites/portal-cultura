(function ($) {
	$(document).ready(function () {
		admin.init();
	});

	var admin = {
		init: function () {
			this.idgFeatureCardWidgets();
			this.idgBannersWidgets();
			this.idgBlockInit();
		},

		idgFeatureCardWidgets: function () {
			$(document).on('keyup', '.idg-feature-card-widget .card-title', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-title').text($(this).val());
			});

			$(document).on('change', '.idg-feature-card-widget .icon-selector', function () {
				var cardIcon = $(this).val();
				console.log( cardIcon );
				if( cardIcon === 'upload-custom-icon' ){
					$(this).closest('.idg-feature-card-widget').find('.feature-card .icon > img').show();
					$(this).closest('.idg-feature-card-widget').find('.custom-icon').removeClass('hidden');
				} else {
					$(this).closest('.idg-feature-card-widget').find('.custom-icon').addClass('hidden');
					$(this).closest('.idg-feature-card-widget').find('.feature-card .icon > img').hide();
					$(this).closest('.idg-feature-card-widget').find('.feature-card .icon').removeClass().addClass('icon ' + $(this).val());
				}
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

			$(document).on('keyup', '.idg-feature-card-widget .card-btn-text', function () {
				$(this).closest('.idg-feature-card-widget').find('.card-btn.btn').text($(this).val());
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

		},

		idgBlockInit: function () {
			if( wp.element ){

				var el = wp.element.createElement,
					registerBlockType = wp.blocks.registerBlockType,
					RichText = wp.editor.RichText;

				function checkForAElement(content) {
					console.log( content );
					if( content.startsWith('<a') ){
						console.log( 'already has a' );
						blockStyle = { backgroundColor: '#f3f4f5' };
					} else {
						console.log( 'MISSING a' );
						blockStyle = { backgroundColor: '#7F0013' };
					}
				}

				var blockStyle;
				registerBlockType( 'gutenberg-boilerplate-es5/idgwp-gutenberg-block-card', {
					title: 'Feature card block',
					icon: 'paperclip',
					category: 'widgets',
					attributes: {
						content: {
							type: 'string',
							source: 'html',
							selector: 'div',
						}
					},
					edit: function( props ) {
						var content = props.attributes.content;

						function onChangeContent( newContent ) {
							props.setAttributes( { content: newContent } );
							checkForAElement( content );
						}

						return el(
							RichText,
							{
								tagName: 'div',
								className: props.className,
								onChange: onChangeContent,
								value: content,
								// style: blockStyle
							}
						);
					},

					save: function( props ) {
						var content = props.attributes.content;
						// checkForAElement( content );
						return el( RichText.Content, {
							tagName: 'div',
							className: props.className,
							value: content
						} );
					},
				});

			}
		}

	};
})(jQuery);
