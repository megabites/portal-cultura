<?php /* Template Name: Secretarias */ ?>

<?php
/**
 * The template for displaying all pages
 *
 * This is the template that displays all pages by default.
 * Please note that this is the WordPress construct of pages
 * and that other 'pages' on your WordPress site may use a
 * different template.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

  <main id="main" class="site-main">

    <div class="container">
      <?php the_breadcrumb (); ?>

      <div class="row">
        <div class="col-12">
          <?php
          while ( have_posts() ) :
            the_post();

            get_template_part( 'template-parts/content-page', 'page' );

            // If comments are open or we have at least one comment, load up the comment template.
            if ( comments_open() || get_comments_number() ) :
              comments_template();
            endif;

          endwhile; // End of the loop.
          ?>
        </div>
      </div>
    </div>

    <div class="container mt-4">
      <div class="col-12 pt-4 pb-4">
        <div id="search-content-wrapper">
          <h2 class="text-center">Notícias</h2>
        </div>

        <div class="row">
          <?php

          $args = array(
            'posts_per_page' => 3,
            'category_name'  => 'noticias'
          );

          $news_query = new WP_Query( $args ); ?>

          <?php if ($news_query->have_posts()) : ?>
            <ul id="posts-list">

              <?php while ($news_query->have_posts()) : ?>
                <?php $news_query->the_post(); ?>

                <li id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                  <div class="categories"><?php the_category(', '); ?></div>

                  <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                  <p><?php echo idg_excerpt(); ?></p>

                  <?php if (get_the_tags()) : ?>
                    <div class="tags-list">
                      <?php the_tags('<span>tags:</span>', ''); ?>
                    </div>
                  <?php endif; ?>

                  <span class="details">
                    por <?php the_author_posts_link(); ?>
                    última modificação em <?php the_modified_date('d/m/Y'); ?> <?php the_modified_time('H'); ?>
                    h<?php the_modified_time('i'); ?>
                  </span>
                </li>

              <?php endwhile; ?>

              <?php if ( function_exists('wp_bootstrap_pagination') ){
                wp_bootstrap_pagination();
              }; ?>


            </ul>

          <?php else : ?>

            <?php get_template_part('template-parts/content', 'none'); ?>

          <?php endif; ?>
        </div>
      </div>
    </div>
  </main>
<?php
get_footer();
