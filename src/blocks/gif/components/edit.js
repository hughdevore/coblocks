/**
 * External dependencies
 */
import classnames from 'classnames';
import ResizableBox from 're-resizable';

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;
const { Component } = wp.element;
const { keycodes, viewPort, } = wp.utils;
const { Placeholder, Spinner, Button } = wp.components;
const { registerBlockType, withContext } = wp.blocks;

/**
 * Internal dependencies
 */
import Controls from './controls';
import icons from './icons';
import Inspector from './inspector';
import Size from './size';

/**
 * Block constants
 */
const GIPHY_URL = 'https://api.giphy.com/v1/gifs/search?api_key=w0o6fO8pv5gSM334gfqUlcdrVaaoiA81&limit=10&offset=0&rating=G&lang=en&q=';
const MIN_SIZE = 20;
const ESCAPE = keycodes;

/**
 * Block edit function
 */
export default class GifBlock extends Component {

	constructor() {
		super( ...arguments );
	}

	render() {

		const {
			attributes,
			className,
			isSelected,
			setAttributes,
			settings,
			toggleSelection,
		} = this.props;

		const {
			align,
			alt,
			height,
			id,
			url,
			width,
		} = attributes;

		const figureStyle = width ? { width } : {};
		const isResizable = [ 'wide', 'full' ].indexOf( align ) === -1 && ( ! viewPort.isExtraSmall() );
		const classes = classnames( className, {
			'is-resized': !! width,
			'is-focused': isSelected,
		} );

		var results = [];

		var fetchGifs = _.debounce( function fetchGifs( search ) {

			if ( attributes.fetching ) {
				return;
			}

			setAttributes( { fetching: true } );

			$.getJSON( GIPHY_URL + encodeURI( search ) )
				.success( function fetchSuccess( data ) {
					setAttributes( { fetching: false, matches: data.data } );
				} )
				.fail( function fetchFail() {
					setAttributes( { fetching: false } );
				} );
		}, 1000 );

		if ( url ) {
			return [
				isSelected && (
					<Controls
						{ ...this.props }
					/>
				),
				isSelected && (
					<Inspector
						{ ...this.props }
					/>
				),
				<figure key="image" className={ classes } style={ figureStyle }>
					<Size src={ url } dirtynessTrigger={ align }>
						{ ( sizes ) => {
							const {
								imageWidthWithinContainer,
								imageHeightWithinContainer,
								imageWidth,
								imageHeight,
							} = sizes;

							// Disable reason: Image itself is not meant to be
							// interactive, but should direct focus to block
							// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
							const img = <img src={ url } alt={ alt }/>;

							if ( ! isResizable || ! imageWidthWithinContainer ) {
								return img;
							}

							const currentWidth = width || imageWidthWithinContainer;
							const currentHeight = height || imageHeightWithinContainer;

							const ratio = imageWidth / imageHeight;
							const minWidth = imageWidth < imageHeight ? MIN_SIZE : MIN_SIZE * ratio;
							const minHeight = imageHeight < imageWidth ? MIN_SIZE : MIN_SIZE / ratio;

							return (
								<ResizableBox
									size={ {
										width: currentWidth,
										height: currentHeight,
									} }
									minWidth={ minWidth }
									// maxWidth={ 608 }
									minHeight={ minHeight }
									// maxHeight={ }
									lockAspectRatio
									handleClasses={ {
										topRight: 'wp-block-image__resize-handler-top-right',
 										bottomRight: 'wp-block-image__resize-handler-bottom-right',
 										topLeft: 'wp-block-image__resize-handler-top-left',
 										bottomLeft: 'wp-block-image__resize-handler-bottom-left',
									} }
									enable={ { top: false, right: true, bottom: false, left: false, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true } }
									onResizeStart={ () => {
										toggleSelection( false );
									} }
									onResizeStop={ ( event, direction, elt, delta ) => {
										setAttributes( {
											width: parseInt( currentWidth + delta.width, 10 ),
											height: parseInt( currentHeight + delta.height, 10 ),
										} );
										toggleSelection( true );
									} }
								>
									{ img }
								</ResizableBox>
							);
						} }
					</Size>
				</figure>,
			];

		} else {
			// If there are results, create thumbnails to select from.
			if ( attributes.matches && attributes.matches.length ) {

				results = _.map( attributes.matches, function mapSearchResults( gif ) {

					var gifImage = wp.element.createElement( 'img', {
						key: gif.id + '-img',
						src: gif.images.fixed_height_small.url,
					} );

					return wp.element.createElement( 'li', {
						key: gif.id,
						onClick: function onClickFetchedGif() {
							setAttributes( { url: gif.images.original.url } );
						}
					}, gifImage );

				} );
			}

			// If there is a giphy request happening, lets show a spinner.
			if ( ! results.length && attributes.fetching ) {
				results = <Spinner/>;
			}

			return [
				<Placeholder
					key="placeholder"
					icon="format-image"
					label={ __( 'Gif' ) }
					instructions={ __( 'Search for that perfect gif on Giphy' ) }
					className={ className }>
					<form>
						{ icons.giphy }
						<input
							key="search-field"
							type="text"
							placeholder={ __( 'Search for gifs here…' ) }
							onChange={ ( event ) => fetchGifs( event.target.value ) }
							onKeyDown={ ( event ) => {
								if ( event.keyCode === ESCAPE ) {
									event.target.value = '';
									setAttributes( { matches: [] } );
								}
							} }
						/>
						<ul
							key="results"
							className={ `${ className }__results` }
						>
							{ results }
						</ul>
					</form>
				</Placeholder>
			]
		}
	}
}