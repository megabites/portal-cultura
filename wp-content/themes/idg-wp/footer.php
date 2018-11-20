<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after.
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Identidade_Digital_do_Governo_-_WordPress
 */

?>
	<footer id="main-footer">
		<div class="container">
			<div class="row">
				<div class="col-lg-12">
					<h3 class="social-title text-uppercase">Redes sociais</h3>

					<ul class="social-medias">
						<li class="twitter">
							<a href="#">Twitter</a>
						</li>
						<li class="youtube">
							<a href="#">Youtube</a>
						</li>
						<li class="facebook">
							<a href="#">Facebook</a>
						</li>
						<li class="flickr">
							<a href="#">Flickr</a>
						</li>
					</ul>
				</div>
			</div>
			<div class="row menus">
				<?php if ( is_active_sidebar( 'footer-widgets-area' ) ) :
					dynamic_sidebar( 'footer-widgets-area' );
				endif; ?>
			</div>
			<div class="row footer-brasil">
				<div class="col-lg-12">
					<a class="logo-acesso-footer" target="_blank" href="http://www.acessoainformacao.gov.br/" alt="Acesso à informação" title="Acesso à informação"></a>
				</div>
			</div>
		</div>
	</footer>

<?php wp_footer(); ?>

</body>
</html>
