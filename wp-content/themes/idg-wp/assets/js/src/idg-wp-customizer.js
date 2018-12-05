/**
 * File customizer.js.
 *
 * Theme Customizer enhancements for a better user experience.
 *
 * Contains handlers to make Theme Customizer preview reload changes asynchronously.
 */

( function( $, api ) {
	// Short-circuit selective refresh events if not in customizer preview or pre-4.5.
	hasSelectiveRefresh = (
		'undefined' !== typeof wp &&
		wp.customize &&
		wp.customize.selectiveRefresh &&
		wp.customize.widgetsPreview &&
		wp.customize.widgetsPreview.WidgetPartial
	);
	if (hasSelectiveRefresh) {
		console.log( 'hasSelectiveRefresh Ok, pode continuar');
	} else {
		console.log( 'hasSelectiveRefresh', hasSelectiveRefresh );
	}

	// Site title and description.
	/*api( 'blogname', function( value ) {
		value.bind( function( to ) {
			$( '.site-title a' ).text( to );
		} );
	} );
	api( 'blogdescription', function( value ) {
		value.bind( function( to ) {
			$( '.site-description' ).text( to );
		} );
	} );*/

	// Header text color.
	api( 'header_textcolor', function( value ) {
		value.bind( function( to ) {
			if ( 'blank' === to ) {
				$( '.site-title, .site-description' ).css( {
					'clip': 'rect(1px, 1px, 1px, 1px)',
					'position': 'absolute'
				} );
			} else {
				$( '.site-title, .site-description' ).css( {
					'clip': 'auto',
					'position': 'relative'
				} );
				$( '.site-title a, .site-description' ).css( {
					'color': to
				} );
			}
		} );
	} );

	api( 'customize_services_widgets_area', function( value ) {
		// api.selectiveRefresh('customize_services_widgets_area');

		value.bind( function( to ) {
			console.log( to );
			wp.customize.previewer.refresh();
			// $( '.site-description' ).text( to );
			// wp.refresh(); // wp.customize.selectiveRefresh
		} );
	} );

	/* api.selectiveRefresh.bind( 'partial-content-rendered', function( placement ) {
		placement.partial.refresh();

		if ( placement.container && placement.container.find( 'iframe.services' ).length ) {
			placement.partial.refresh();
		}
	} ); */


	/**
	 * TUTO
	 */

	/*
	// Re-load Twitter widgets when a partial is rendered.
	api.selectiveRefresh.bind( 'partial-content-rendered', function( placement ) {
		if ( placement.container ) {
			twttr.widgets.load( placement.container[0] );
		}
	} );

	// Refresh a moved partial containing a Twitter timeline iframe, since it has to be re-built.
	api.selectiveRefresh.bind( 'partial-content-moved', function( placement ) {
		if ( placement.container && placement.container.find( 'iframe.twitter-timeline:not([src]):first' ).length ) {
			placement.partial.refresh();
		}
	} );
	*/
	// TUTO

} )( jQuery, wp.customize );
