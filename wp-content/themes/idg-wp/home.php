<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * E.g., it puts together the home page when no home.php file exists.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

	<main id="main" class="site-main">

		<section class="carousel-wrapper">
			<?php get_template_part('template-parts/jumbotron-carousel'); ?>
		</section>

		<section class="services mt-5 mb-5">
			<div class="container">
				<div class="row">
					<?php
					if ( is_active_sidebar( 'services-widgets-area' ) ) :
						dynamic_sidebar( 'services-widgets-area' );
					endif;
					?>
				</div>
			</div>
		</section>
		<section id="news" class="pb-5 pt-5 bg-grey-2">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Notícias</h2>
					</div>
					<?php
					/*$args      = array(
						'posts_per_page' => 3,
						'category_name'  => 'noticias'
					);*/
					$args = [];
					if( get_option('idg-wp_theme_options_news_sections') ){
						$args['category_name'] = get_option('idg-wp_theme_options_news_sections');
					}
					if( get_option('idg-wp_theme_options_news_sections_items') ){
						$args['posts_per_page'] = get_option('idg-wp_theme_options_news_sections_items');
					} else {
						$args['posts_per_page'] = 3;
					}
					$news_query = new WP_Query( $args ); ?>

					<?php if ( $news_query->have_posts() ) : ?>

						<?php while ( $news_query->have_posts() ) : $news_query->the_post(); ?>
							<h2></h2>
							<div class="col-lg-4 mb-5">
								<?php
								if ( has_post_thumbnail() ) {
									$post_thumb = get_the_post_thumbnail_url();
								} else {
									$post_thumb = get_template_directory_uri() . '/assets/img/fake-img.jpg';
								}
								?>
								<div class="highlight-box" style="background-image: url('<?php echo $post_thumb; ?>')">
									<div class="box-body">
										<?php if( $post_subtitle = get_post_meta( $post->ID, '_post_subtitle', true ) ): ?>
											<span class="cat"><?php echo $post_subtitle?></span>
										<?php endif; ?>
										<h3 class="box-title">
											<a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
										</h3>
									</div>
								</div>
							</div>
						<?php endwhile; ?>

						<?php wp_reset_postdata(); ?>

					<?php else : ?>
						<p class="text-uppercase text-center">Sem notícias</p>
					<?php endif; ?>
				</div>
				<div class="col-lg-12 text-center">
					<a href="<?php echo home_url( '/categoria/noticias/' ); ?>" class="btn text-uppercase mt-1">Mais
						notícias</a>
				</div>
			</div>
		</section>

		<section class="pt-5 pb-5 mb-5" id="agenda">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<?php echo do_shortcode( '[gs-agenda event-cats="agenda-cultural, agendo-do-ministro, cursos-e-formacao"]' ); ?>
					</div>
				</div>
			</div>
		</section>

		<section class="pt-5 pb-5 mb-5">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Conheça o Ministério</h2>
					</div>
					<?php
					if ( is_active_sidebar( 'meet-the-ministry-widgets-area' ) ) :
						dynamic_sidebar( 'meet-the-ministry-widgets-area' );
					endif;
					?>
				</div>
			</div>
		</section>

		<section class="pt-5 pb-5" id="section-content">
			<div class="container">
				<div class="row">
					<?php
					if ( is_active_sidebar( 'content-widgets-area' ) ) :
						dynamic_sidebar( 'content-widgets-area' );
					endif;
					?>
				</div>
			</div>
		</section>

		<section class="mt-5 mb-5">
			<div class="container">
				<div class="row">
					<div class="col-lg-12">
						<h2 class="section-title mb-5 text-center">Participação Social</h2>
					</div>
					<?php
					if ( is_active_sidebar( 'social-participation-widgets-area' ) ) :
						dynamic_sidebar( 'social-participation-widgets-area' );
					endif;
					?>
				</div>
			</div>
		</section>

		<section class="mt-5" id="multimidia">
			<div class="container">
				<div class="row">
					<?php
					$args      = array(
						'post_type'  => 'multimedia',
						'posts_per_page' => 1,
					);
					$multimedia_query = new WP_Query( $args ); ?>

					<?php if ( $multimedia_query->have_posts() ) : ?>

						<?php while ( $multimedia_query->have_posts() ) : $multimedia_query->the_post(); ?>
							<?php
							$taxonomy_names = wp_get_post_terms(get_the_ID(), 'multimedia-type');

							if ( has_post_thumbnail() ) {
								$multimedia_thumb = get_the_post_thumbnail_url();
							} else {
								/* echo get_first_post_image();
								$x = get_post_gallery_images();
								print_r($x); */

								if( $taxonomy_names[0]->slug == 'video' ):
									$video_id = embeded_youtube_video_id( get_the_content() );

									if( $video_id ){
										$multimedia_thumb = 'https://img.youtube.com/vi/'. $video_id .'/maxresdefault.jpg';
									} else {
										$multimedia_thumb = get_template_directory_uri() . '/assets/img/media-'. $taxonomy_names[0]->slug .'-thumb.png';
									}

								else:
									$multimedia_thumb = get_template_directory_uri() . '/assets/img/media-'. $taxonomy_names[0]->slug .'-thumb.png';
								endif;
							}
							?>
							<div class="highlight" style="background-image: url('<?php echo $multimedia_thumb; ?>');">
								<a href="<?php the_permalink(); ?>">
									<h3><?php the_title(); ?></h3>
									<?php echo idg_excerpt(30); ?>
								</a>
							</div>
						<?php endwhile; ?>

						<?php wp_reset_postdata(); ?>

					<?php endif; ?>

					<?php
					if ( is_active_sidebar( 'multimedia-widgets-area' ) ) :
						dynamic_sidebar( 'multimedia-widgets-area' );
					endif;
					?>
				</div>
			</div>
		</section>

	</main>

<?php
get_footer();
