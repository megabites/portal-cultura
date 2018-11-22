<?php
/**
 * Template part for displaying page content in page.php
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>

<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
	<header class="entry-header has-menu">
		<?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>

		<div class="menu-wrapper">
			<div class="menu-content">
				<a href="#this">Subdiretoria1</a>
				<a href="#this">Subdiretoria2</a>
				<button type="button" class="icon-plus toggle-active"></button>

				<ul>
					<li><a href="#this">Subdiretoria3</a></li>
					<li><a href="#this">Subdiretoria4</a></li>
					<li><a href="#this">Subdiretoria5</a></li>
					<li><a href="#this">Subdiretoria6</a></li>
					<li><a href="#this">Subdiretoria7</a></li>
					<li><a href="#this">Subdiretoria8</a></li>
				</ul>
			</div>
		</div>
	</header><!-- .entry-header -->

	<?php idg_wp_post_thumbnail(); ?>

	<div class="entry-content">
		<?php
		the_content();

		wp_link_pages( array(
			'before' => '<div class="page-links">' . esc_html__( 'Pages:', 'idg-wp' ),
			'after'  => '</div>',
		) );
		?>
	</div><!-- .entry-content -->

	<?php if ( get_edit_post_link() ) : ?>
		<footer class="entry-footer">
			<?php
			edit_post_link(
				sprintf(
					wp_kses(
						/* translators: %s: Name of current post. Only visible to screen readers */
						__( 'Edit <span class="screen-reader-text">%s</span>', 'idg-wp' ),
						array(
							'span' => array(
								'class' => array(),
							),
						)
					),
					get_the_title()
				),
				'<span class="edit-link">',
				'</span>'
			);
			?>
		</footer><!-- .entry-footer -->
	<?php endif; ?>
</article><!-- #post-<?php the_ID(); ?> -->
