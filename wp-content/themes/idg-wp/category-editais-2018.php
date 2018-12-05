<?php
/**
 * The template for displaying category results pages
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#search-result
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

get_header();
?>

  <main id="main" class="site-main">
    <div class="container">
      <div class="row">
        <?php the_breadcrumb(); ?>
      </div>

      <div id="content" class="row">
        <div class="col-12">

          <h1 class="page-title text-center">
            <?php echo get_cat_name(get_query_var('cat')); ?>
          </h1>

          <div id="search-content-wrapper">
            <!-- <h2>O que você esta procurando?</h2> -->
            <form id="search-content">
              <input type="text" name="search" placeholder="Buscar" />
              <button type="submit"><i class="icon-search"></i></button>
            </form>
          </div>

          <?php get_template_part('template-parts/posts-list', 'category'); ?>

          <?php get_template_part('template-parts/copyright'); ?>
        </div>
      </div>
    </div>
  </main>

<?php
get_footer();
