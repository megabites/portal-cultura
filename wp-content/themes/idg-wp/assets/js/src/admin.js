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
			function media_upload(button_class) {
				var _custom_media = true,
					_orig_send_attachment = wp.media.editor.send.attachment;

				$('body').on('click', button_class, function(e) {
					var button_id ='#'+$(this).attr('id');
					var self = $(button_id);
					var send_attachment_bkp = wp.media.editor.send.attachment;
					var button = $(button_id);
					// var id = button.attr('id').replace('_button', '');
					_custom_media = true;
					wp.media.editor.send.attachment = function(props, attachment){
						if ( _custom_media  ) {
							$('.custom_media_id').val(attachment.id);
							$('.custom_media_url').val(attachment.url);
							$('.custom_media_image').attr('src',attachment.url).css('display','block');
						} else {
							return _orig_send_attachment.apply( button_id, [props, attachment] );
						}
					}
					wp.media.editor.open(button);
					return false;
				});
			}
			media_upload('.upload_image_button');

			/* var image_field;
			$(document).on('click', '.upload_image_button', function(e){
				image_field = $(this).siblings('.img');
				tb_show('', 'media-upload.php?type=image&amp;TB_iframe=true');
				return false;
			});
			window.send_to_editor = function(html) {
				imgurl = $('img', html).attr('src');
				image_field.val(imgurl);
				tb_remove();

				console.log( image_field.val(imgurl) );
			}; */
		}
	};
})(jQuery);
