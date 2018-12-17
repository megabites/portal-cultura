<?php /* Template Name: Informação ao Cidadão */ ?>

<?php get_header(); ?>

<main id="page-info" class="site-main">
	<div class="container">
		<div class="row">
			<?php the_breadcrumb(); ?>
		</div>

		<?php wp_reset_postdata(); ?>

		<div id="content">

			<div class="row title-wrapper">
				<div class="title text-center">
					<?php the_content(); ?>
				</div>
			</div>

			<div class="entry-content">
				<?php get_template_part( 'template-parts/copyright' ); ?>
			</div>
		</div>
</main>

<?php get_footer(); ?>


